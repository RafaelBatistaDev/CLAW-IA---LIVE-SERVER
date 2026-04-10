import * as vscode from 'vscode';
import express, { Request, Response, NextFunction } from 'express';
import open from 'open';
import chokidar from 'chokidar';
import { Server as WsServer } from 'ws';
import path from 'path';
import http from 'http';
import https from 'https';
import selfsigned from 'selfsigned';
import fs from 'fs';
import { SecurityValidator, SecurityMiddleware } from './security';
import os from 'os';
import proxy from 'express-http-proxy';

type ServerInstance = http.Server | https.Server;

interface HttpsConfig {
  enable: boolean;
  cert?: string;
  key?: string;
  passphrase?: string;
}

interface ProxyConfig {
  enable: boolean;
  baseUri: string;
  proxyUri: string;
}

const RELOAD_ROUTE = '/__claw-ia/reload.js';

export class LiveServer {
  private app: express.Express | null = null;
  private server: ServerInstance | null = null;
  private wsServer: WsServer | null = null;
  private watcher: chokidar.FSWatcher | null = null;
  private rootPath: string | null = null;
  private activeHost: string | null = null;
  private activePort: number | null = null;
  private activeProtocol: 'http' | 'https' = 'http';
  private logger: vscode.OutputChannel | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private changeTracker: Map<string, number> = new Map();

  constructor(logger?: vscode.OutputChannel) {
    this.logger = logger || null;
  }

  public setLogger(logger: vscode.OutputChannel): void {
    this.logger = logger;
  }

  private log(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    if (this.logger) {
      this.logger.appendLine(logMessage);
    }
    console.log(logMessage);
  }

  public isRunning(): boolean {
    return !!this.server;
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const testServer = http.createServer();

      testServer.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.log(`Porta ${port} já está em uso`, 'warn');
        } else {
          this.log(`Erro ao verificar porta: ${error.message}`, 'error');
        }
        resolve(false);
      });

      testServer.once('listening', () => {
        testServer.close();
        resolve(true);
      });

      testServer.listen(port, '127.0.0.1');
    });
  }

  private getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  private async readHttpsConfig(): Promise<{ cert?: string; key?: string }> {
    const config = vscode.workspace.getConfiguration();
    const httpsConfig = config.get<HttpsConfig>('liveServer.settings.https', { enable: false });

    if (!httpsConfig.enable || !httpsConfig.cert || !httpsConfig.key) {
      this.log('Usando certificado SSL auto-assinado', 'info');
      return {};
    }

    try {
      const certPath = httpsConfig.cert.replace('${workspaceFolder}', this.rootPath || '');
      const keyPath = httpsConfig.key.replace('${workspaceFolder}', this.rootPath || '');

      if (!(await this.fileExists(certPath))) {
        this.log(`Certificado não encontrado: ${certPath}`, 'warn');
        return {};
      }

      if (!(await this.fileExists(keyPath))) {
        this.log(`Chave privada não encontrada: ${keyPath}`, 'warn');
        return {};
      }

      const cert = await fs.promises.readFile(certPath, 'utf8');
      const key = await fs.promises.readFile(keyPath, 'utf8');

      this.log('Certificado HTTPS carregado com sucesso', 'info');
      return { cert, key };
    } catch (error) {
      this.log(`Erro ao ler certificado HTTPS: ${error}`, 'error');
      return {};
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async start(uri?: vscode.Uri) {
    if (this.server) {
      this.log('Servidor já está em execução', 'warn');
      vscode.window.showWarningMessage('CLAW IA - LIVE SERVER já está rodando!');
      return;
    }

    this.log('Iniciando CLAW IA - LIVE SERVER...', 'info');

    const workspacePath = this.getWorkspacePath(uri);
    if (!workspacePath) {
      this.log('Nenhuma workspace aberta', 'error');
      vscode.window.showErrorMessage('Nenhuma workspace aberta para iniciar o CLAW IA - LIVE SERVER.');
      return;
    }

    this.rootPath = workspacePath;
    this.log(`Workspace detectado: ${workspacePath}`, 'info');

    const config = vscode.workspace.getConfiguration();

    let port            = config.get<number>('liveServer.settings.port', 5500);
    let host            = config.get<string>('liveServer.settings.host', '127.0.0.1');
    const useLocalIp    = config.get<boolean>('liveServer.settings.useLocalIp', false);
    const noBrowser     = config.get<boolean>('liveServer.settings.noBrowser', false);
    const browser       = config.get<string | null>('liveServer.settings.CustomBrowser', null) ?? '';
    const advanceBrowser = config.get<string | null>('liveServer.settings.AdvanceCustomBrowserCmdLine', null) ?? '';
    const root          = config.get<string>('liveServer.settings.root', '/');
    const corsEnabled   = config.get<boolean>('liveServer.settings.cors', false);
    const customHeaders = config.get<Record<string, string>>('liveServer.settings.headers', {});
    const fullReload    = config.get<boolean>('liveServer.settings.fullReload', false);
    const waitMs        = config.get<number>('liveServer.settings.wait', 100);
    const useWebExt     = config.get<boolean>('liveServer.settings.useWebExt', false);
    const ignoreFiles   = config.get<string[]>('liveServer.settings.ignoreFiles', ['**/node_modules/**', '**/.git/**']);
    const httpsConfig   = config.get<HttpsConfig>('liveServer.settings.https', { enable: false });
    const proxyConfig   = config.get<ProxyConfig>('liveServer.settings.proxy', { enable: false, baseUri: '/', proxyUri: 'http://127.0.0.1:80' });
    const mounts        = config.get<Array<[string, string]>>('liveServer.settings.mount', []);
    const entryFile     = config.get<string>('liveServer.settings.file', '');

    // Ajustar host para IP local se necessário
    if (useLocalIp && (host === 'localhost' || host === '127.0.0.1')) {
      host = this.getLocalIpAddress();
      this.log(`Usando IP local: ${host}`, 'info');
    }

    // Porta aleatória
    if (port === 0) {
      port = Math.floor(Math.random() * (9999 - 3000) + 3000);
      this.log(`Porta aleatória gerada: ${port}`, 'info');
    }

    // Aplicar root path customizado
    let finalRootPath = this.rootPath;
    if (root && root !== '/') {
      finalRootPath = path.join(finalRootPath, root);
      if (!(await this.fileExists(finalRootPath))) {
        this.log(`Root path não existe: ${finalRootPath}`, 'error');
        vscode.window.showErrorMessage(`Root path não existe: ${root}`);
        return;
      }
      this.log(`Root path customizado: ${finalRootPath}`, 'info');
    }
    this.rootPath = finalRootPath;

    // Validar porta e host
    if (!SecurityValidator.validatePort(port)) {
      this.log(`Porta inválida: ${port}`, 'error');
      vscode.window.showErrorMessage(`Porta inválida: ${port}. Use uma porta entre 1024 e 65535.`);
      return;
    }

    if (!SecurityValidator.validateHost(host)) {
      this.log(`Host inválido: ${host}`, 'error');
      vscode.window.showErrorMessage(`Host inválido: ${host}. Use localhost, 127.0.0.1 ou um hostname válido.`);
      return;
    }

    // Verificar disponibilidade da porta
    this.log(`Verificando disponibilidade da porta ${port}...`, 'info');
    if (!(await this.isPortAvailable(port))) {
      this.log(`Falha ao iniciar: porta ${port} não está disponível`, 'error');
      vscode.window.showErrorMessage(`Porta ${port} já está em uso. Mude a porta nas configurações e tente novamente.`);
      return;
    }
    this.log(`Porta ${port} disponível`, 'info');

    this.app = express();

    // Middlewares de segurança
    this.log('Configurando middlewares de segurança...', 'info');
    this.app.use(SecurityMiddleware.securityHeadersMiddleware());
    this.app.use(SecurityMiddleware.pathTraversalMiddleware(this.rootPath));

    // Headers customizados
    if (Object.keys(customHeaders).length > 0) {
      this.log('Adicionando headers customizados', 'info');
      this.app.use((req, res, next) => {
        Object.entries(customHeaders).forEach(([key, value]) => res.setHeader(key, value));
        next();
      });
    }

    // CORS
    if (corsEnabled) {
      this.log('CORS habilitado', 'info');
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
      });
    }

    // Proxy reverso
    if (proxyConfig.enable) {
      this.log(`Proxy configurado: ${proxyConfig.baseUri} -> ${proxyConfig.proxyUri}`, 'info');
      try {
        this.app.use(proxyConfig.baseUri, proxy(proxyConfig.proxyUri, {
          proxyReqPathResolver: (req: Request) => {
            const originalPath = req.originalUrl.substring(proxyConfig.baseUri.length);
            return originalPath || '/';
          }
        }));
      } catch (error) {
        this.log(`Erro ao configurar proxy: ${error}`, 'warn');
      }
    }

    // Mounts
    if (mounts.length > 0) {
      this.log(`Montando ${mounts.length} diretórios...`, 'info');
      mounts.forEach(([route, dirPath]) => {
        const fullPath = dirPath.startsWith('/') ? dirPath : path.join(this.rootPath || '', dirPath);
        this.app!.use(route, express.static(fullPath));
        this.log(`  ${route} -> ${fullPath}`, 'info');
      });
    }

    // Injeção de reload script + arquivos estáticos
    this.app.use((req, res, next) => this.injectReloadScript(req, res, next, useWebExt));
    this.app.use(express.static(this.rootPath));

    // Rota SPA / fallback
    this.app.get('*', async (req, res, next) => {
      if (!this.rootPath) return next();

      if (entryFile) {
        const entryPath = path.join(this.rootPath, entryFile);
        try {
          const html = await fs.promises.readFile(entryPath, 'utf8');
          return res.send(this.insertReloadScript(html, useWebExt));
        } catch {
          this.log(`Entry file não encontrado: ${entryFile}`, 'warn');
        }
      }

      const requestedPath = decodeURIComponent(req.path.split('?')[0]);
      const filePath = path.join(this.rootPath, requestedPath);
      const extension = path.extname(filePath).toLowerCase();
      const spaExtensions = ['.js', '.jsx', '.ts', '.tsx', '.cshtml', '.razor'];

      if (spaExtensions.includes(extension) || requestedPath === '/' || !path.extname(requestedPath)) {
        const indexHtml = await this.findIndexHtml();
        if (indexHtml) {
          const html = await fs.promises.readFile(indexHtml, 'utf8');
          return res.send(this.insertReloadScript(html, useWebExt));
        }
      }

      next();
    });

    const protocol = httpsConfig.enable ? 'https' : 'http';
    const openUrl = `${protocol}://${host}:${port}`;

    this.activeHost = host;
    this.activePort = port;
    this.activeProtocol = protocol;

    // Criar servidor HTTP ou HTTPS
    if (httpsConfig.enable) {
      const httpsFiles = await this.readHttpsConfig();
      const httpsOptions: https.ServerOptions = {
        cert: httpsFiles.cert,
        key: httpsFiles.key,
      };

      if (!httpsOptions.cert || !httpsOptions.key) {
        this.log('Gerando certificado SSL auto-assinado...', 'info');
        const pems = selfsigned.generate([{ name: 'commonName', value: host }], { days: 365 });
        httpsOptions.cert = pems.cert;
        httpsOptions.key = pems.private;
      }

      this.server = https.createServer(httpsOptions, this.app);
    } else {
      this.server = http.createServer(this.app);
    }

    // WebSocket
    this.log('Configurando WebSocket server...', 'info');
    this.wsServer = new WsServer({ server: this.server });
    this.wsServer.on('connection', (socket: any) => {
      socket.send('connected');
      this.log('Cliente WebSocket conectado', 'info');
    });

    // Iniciar servidor
    this.log(`Iniciando servidor em ${openUrl}...`, 'info');
    await new Promise<void>((resolve, reject) => {
      this.server?.listen(port, () => {
        this.log(`✅ Servidor iniciado com sucesso em ${openUrl}`, 'info');
        resolve();
      });
      this.server?.once('error', reject);
    });

    // File watcher com debounce
    this.log(`Iniciando file watcher com debounce ${waitMs}ms...`, 'info');
    this.watcher = chokidar.watch(this.rootPath, {
      ignored: ignoreFiles,
      ignoreInitial: true,
      persistent: true
    });

    this.watcher.on('all', (event, filePath) => {
      const now = Date.now();
      const lastChange = this.changeTracker.get(filePath) || 0;

      if (now - lastChange < 1000) return;
      this.changeTracker.set(filePath, now);

      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      this.debounceTimer = setTimeout(() => {
        const ext = path.extname(filePath).toLowerCase();
        const isCssOnly = ext === '.css' && !fullReload;

        this.log(`Detectado: ${event} - ${path.basename(filePath)}`, 'info');
        this.log(isCssOnly ? 'Reload CSS-only' : 'Enviando reload completo...', 'info');

        this.broadcastReload();
      }, waitMs);
    });

    // Abrir navegador
    if (!noBrowser) {
      this.log(`Abrindo navegador: ${openUrl}`, 'info');
      const browserOptions: any = {};

      if (advanceBrowser) {
        browserOptions.app = advanceBrowser;
      } else if (browser) {
        browserOptions.app = { name: browser };
      }

      await open(openUrl, browserOptions).catch(error => {
        this.log(`Erro ao abrir navegador: ${error.message}`, 'warn');
      });
    }

    this.log(`CLAW IA - LIVE SERVER pronto em ${openUrl}`, 'info');
    if (!config.get<boolean>('liveServer.settings.donotShowInfoMsg', false)) {
      vscode.window.showInformationMessage(`✅ Live Server iniciado em ${openUrl}`);
    }
  }

  public async stop() {
    this.log('Parando CLAW IA - LIVE SERVER...', 'info');

    if (!this.server) {
      this.log('Servidor não está rodando', 'warn');
      vscode.window.showInformationMessage('CLAW IA - LIVE SERVER não está rodando.');
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.log('Fechando conexões...', 'info');
    await new Promise<void>(resolve => this.server?.close(() => resolve()));

    this.watcher?.close();
    this.wsServer?.close();

    this.server = null;
    this.wsServer = null;
    this.watcher = null;
    this.app = null;
    this.rootPath = null;
    this.activeHost = null;
    this.activePort = null;
    this.activeProtocol = 'http';
    this.changeTracker.clear();

    this.log('✅ CLAW IA - LIVE SERVER parado com sucesso', 'info');
    vscode.window.showInformationMessage('CLAW IA - LIVE SERVER parado.');
  }

  public async open(uri?: vscode.Uri) {
    const alreadyRunning = !!this.server;
    if (!this.server) await this.start(uri);
    if (!this.server || !this.rootPath) return;

    const url = this.buildUrl(uri);
    const noBrowser = vscode.workspace.getConfiguration().get<boolean>('liveServer.settings.noBrowser', false);

    if (alreadyRunning || noBrowser) {
      await open(url);
      vscode.window.showInformationMessage(`Abrindo CLAW IA - LIVE SERVER em ${url}`);
    }
  }

  private getWorkspacePath(uri?: vscode.Uri): string | null {
    const folder = uri
      ? vscode.workspace.getWorkspaceFolder(uri)
      : vscode.workspace.workspaceFolders?.[0];
    return folder?.uri.fsPath || null;
  }

  private buildUrl(uri?: vscode.Uri): string {
    const config = vscode.workspace.getConfiguration();
    const port = this.activePort ?? config.get<number>('liveServer.settings.port', 5500);
    const host = this.activeHost ?? config.get<string>('liveServer.settings.host', '127.0.0.1');
    const httpsConfig = this.activeProtocol === 'https'
      ? { enable: true }
      : config.get<HttpsConfig>('liveServer.settings.https', { enable: false });
    const protocol = this.activeProtocol === 'https' || httpsConfig.enable ? 'https' : 'http';

    let relativePath = '';
    if (uri?.fsPath && this.rootPath) {
      const relative = path.relative(this.rootPath, uri.fsPath).split(path.sep).join('/');
      if (relative && !relative.startsWith('..')) {
        relativePath = `/${relative}`;
      }
    }

    return `${protocol}://${host}:${port}${relativePath}`;
  }

  private async injectReloadScript(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
    useWebExt: boolean = false
  ) {
    if (!this.rootPath) { next(); return; }

    if (req.path === RELOAD_ROUTE) {
      res.type('application/javascript').send(this.getReloadScript(useWebExt));
      return;
    }

    const requestedPath = decodeURIComponent(req.path.split('?')[0]);

    if (!SecurityValidator.validatePathTraversal(this.rootPath, requestedPath)) {
      res.status(403).json({ error: 'Access Denied' });
      return;
    }

    const filePath = path.join(
      this.rootPath,
      requestedPath === '/' ? 'index.html' : requestedPath
    );

    if (!SecurityValidator.validateFileExtension(filePath, ['.html', '.htm'])) {
      next(); return;
    }

    try {
      const html = await fs.promises.readFile(filePath, 'utf8');
      res.send(this.insertReloadScript(html, useWebExt));
    } catch {
      next();
    }
  }

  private async findIndexHtml(): Promise<string | null> {
    if (!this.rootPath) return null;

    const candidates = ['index.html', path.join('src', 'index.html')];
    for (const candidate of candidates) {
      const candidatePath = path.join(this.rootPath, candidate);
      if (await this.fileExists(candidatePath)) return candidatePath;
    }
    return null;
  }

  private insertReloadScript(html: string, useWebExt: boolean = false): string {
    if (useWebExt) return html;

    const scriptTag = `<script src="${RELOAD_ROUTE}"></script>`;
    if (html.includes('</body>')) {
      return html.replace(/<\/body>/i, `${scriptTag}</body>`);
    }
    return html + scriptTag;
  }

  private getReloadScript(useWebExt: boolean = false): string {
    if (useWebExt) {
      return `console.log('[CLAW IA] Live Reload controlado pela Web Extension');`;
    }

    const config = vscode.workspace.getConfiguration();
    const port = this.activePort ?? config.get<number>('liveServer.settings.port', 5500);
    let host = this.activeHost ?? config.get<string>('liveServer.settings.host', '127.0.0.1');
    const useLocalIp = config.get<boolean>('liveServer.settings.useLocalIp', false);
    const httpsConfig = this.activeProtocol === 'https'
      ? { enable: true }
      : config.get<HttpsConfig>('liveServer.settings.https', { enable: false });

    if (!SecurityValidator.validatePort(port)) throw new Error(`Porta inválida: ${port}`);
    if (!SecurityValidator.validateHost(host)) throw new Error(`Host inválido: ${host}`);

    if (useLocalIp && (host === 'localhost' || host === '127.0.0.1')) {
      host = this.getLocalIpAddress();
    }

    const protocol = httpsConfig.enable ? 'wss' : 'ws';
    const sanitizedHost = SecurityValidator.sanitizeForScript(host);

    return `(function() {
      try {
        const wsUrl = '${protocol}://${sanitizedHost}:${port}';
        const connection = new WebSocket(wsUrl);

        connection.onopen = function() {
          console.log('[CLAW IA] Conectado ao Live Server');
        };

        connection.onmessage = function(event) {
          if (event.data === 'reload') {
            console.log('[CLAW IA] Recarregando página...');
            location.reload();
          }
        };

        connection.onerror = function(error) {
          console.error('[CLAW IA] Erro de conexão:', error);
        };

        connection.onclose = function() {
          console.log('[CLAW IA] Desconectado do Live Server');
        };
      } catch (error) {
        console.error('[CLAW IA] Erro ao conectar:', error);
      }
    })();`;
  }

  private broadcastReload() {
    this.wsServer?.clients.forEach(client => {
      if (client.readyState === 1) client.send('reload');
    });
  }
}