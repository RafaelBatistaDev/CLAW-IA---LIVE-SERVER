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
const RELOAD_WS_PATH = '/__claw-ia/reload-ws';

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
    this.log(`📂 Root Path: ${this.rootPath}`, 'info');

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

    // Porta aleatória solicitada
    const requestedPort = port;
    if (requestedPort === 0) {
      this.log('Porta 0 detectada: o sistema escolherá uma porta disponível automaticamente.', 'info');
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
      this.log(`🎯 Root path customizado aplicado: ${root}`, 'info');
      this.log(`📂 Novo Root Path: ${finalRootPath}`, 'info');
    }
    this.rootPath = finalRootPath;
    this.log(`✅ Root Path final: ${this.rootPath}`, 'info');

    // Validar porta e host
    if (requestedPort !== 0 && !SecurityValidator.validatePort(requestedPort)) {
      this.log(`Porta inválida: ${requestedPort}`, 'error');
      vscode.window.showErrorMessage(`Porta inválida: ${requestedPort}. Use uma porta entre 1024 e 65535.`);
      return;
    }

    if (!SecurityValidator.validateHost(host)) {
      this.log(`Host inválido: ${host}`, 'error');
      vscode.window.showErrorMessage(`Host inválido: ${host}. Use localhost, 127.0.0.1 ou um hostname válido.`);
      return;
    }

    if (requestedPort !== 0) {
      // Verificar disponibilidade da porta fixa
      this.log(`Verificando disponibilidade da porta ${requestedPort}...`, 'info');
      if (!(await this.isPortAvailable(requestedPort))) {
        this.log(`Falha ao iniciar: porta ${requestedPort} não está em uso`, 'error');
        vscode.window.showErrorMessage(`Porta ${requestedPort} já está em uso. Mude a porta nas configurações e tente novamente.`);
        return;
      }
      this.log(`Porta ${requestedPort} disponível`, 'info');
    }

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

    // Rota para favicon (evita erro 404)
    this.app.get('/favicon.ico', (req, res) => {
      res.status(204).send();
    });

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

        // Se não encontrou index.html, servir HTML padrão
        if (requestedPath === '/' || !path.extname(requestedPath)) {
          const defaultHtml = this.getDefaultHtml();
          return res.send(this.insertReloadScript(defaultHtml, useWebExt));
        }
      }

      next();
    });

    const protocol = httpsConfig.enable ? 'https' : 'http';

    this.activeHost = host;
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
    this.wsServer = new WsServer({ server: this.server, path: RELOAD_WS_PATH });
    this.wsServer.on('connection', (socket: any) => {
      socket.send('connected');
      this.log('Cliente WebSocket conectado', 'info');
    });

    // Iniciar servidor
    await new Promise<void>((resolve, reject) => {
      this.server?.listen(requestedPort, () => {
        const address = this.server?.address();
        if (address && typeof address !== 'string') {
          port = address.port;
          this.activePort = port;
        }

        const openUrl = `${protocol}://${host}:${port}`;
        this.log(`Iniciando servidor em ${openUrl}...`, 'info');
        this.log(`✅ Servidor iniciado com sucesso em ${openUrl}`, 'info');
        resolve();
      });
      this.server?.once('error', reject);
    });

    const openUrl = `${protocol}://${host}:${port}`;

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
      // Construir URL usando o arquivo atual (ou índice padrão)
      const browserUrl = this.buildUrl(uri);
      this.log(`Abrindo navegador: ${browserUrl}`, 'info');
      const browserOptions: any = {};

      if (advanceBrowser) {
        browserOptions.app = advanceBrowser;
      } else if (browser) {
        browserOptions.app = { name: browser };
      }

      await open(browserUrl, browserOptions).catch(error => {
        this.log(`Erro ao abrir navegador: ${error.message}`, 'warn');
      });
    }

    const finalUrl = this.buildUrl(uri);
    this.log(`CLAW IA - LIVE SERVER pronto em ${finalUrl}`, 'info');
    if (!config.get<boolean>('liveServer.settings.donotShowInfoMsg', false)) {
      vscode.window.showInformationMessage(`✅ Live Server iniciado em ${finalUrl}`);
    }
  }

  public async stop() {
    this.log('Parando CLAW IA - LIVE SERVER...', 'info');

    try {
      if (this.server) {
        // Força o fechamento de todas as conexões do servidor
        await new Promise<void>(resolve => {
          this.server?.close(() => {
            this.log('Servidor HTTP/HTTPS fechado', 'info');
            resolve();
          });
        });
        this.server.unref();
      }

      if (this.watcher) {
        await this.watcher.close();
        this.log('File watcher fechado', 'info');
      }

      if (this.wsServer) {
        this.wsServer.close();
        this.log('WebSocket server fechado', 'info');
      }

      this.log('Conexões encerradas com sucesso', 'info');
    } catch (error) {
      this.log(`Erro ao parar servidor: ${error}`, 'error');
    } finally {
      // ESSENCIAL: Resetar as variáveis independente de erro
      this.server = null;
      this.wsServer = null;
      this.watcher = null;
      this.app = null;
      this.rootPath = null;
      this.activeHost = null;
      this.activePort = null;
      this.activeProtocol = 'http';
      this.changeTracker.clear();

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      this.log('✅ Estado do servidor resetado completamente', 'info');
      vscode.window.showInformationMessage('CLAW IA - LIVE SERVER parado.');
    }
  }

  public async open(uri?: vscode.Uri) {
    if (!this.server) await this.start(uri);
    if (!this.server || !this.rootPath) return;

    const url = this.buildUrl(uri);
    await open(url);
    vscode.window.showInformationMessage(`Abrindo CLAW IA - LIVE SERVER em ${url}`);
  }

  private getWorkspacePath(uri?: vscode.Uri): string | null {
    // Prioridade 1: URI do documento ativo (permite servir de qualquer subpasta)
    if (uri && uri.fsPath) {
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      // Se o arquivo está dentro de uma workspace folder, usar a raiz da workspace
      if (folder?.uri.fsPath) {
        return path.normalize(folder.uri.fsPath);
      }
      // Se não está em workspace, usar o diretório do arquivo
      return path.normalize(path.dirname(uri.fsPath));
    }

    // Prioridade 2: Editor ativo (permite servir de qualquer subpasta)
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.fsPath) {
      const uri = activeEditor.document.uri;
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      // Se o arquivo está dentro de uma workspace folder, usar a raiz da workspace
      if (folder?.uri.fsPath) {
        return path.normalize(folder.uri.fsPath);
      }
      // Se não está em workspace, usar o diretório do arquivo
      return path.normalize(path.dirname(uri.fsPath));
    }

    // Prioridade 3: Primeira workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder?.uri.fsPath) {
      return path.normalize(workspaceFolder.uri.fsPath);
    }

    return null;
  }

  private buildUrl(uri?: vscode.Uri): string {
    const config = vscode.workspace.getConfiguration();
    const port = this.activePort ?? config.get<number>('liveServer.settings.port', 5500);
    let host = this.activeHost ?? config.get<string>('liveServer.settings.host', '127.0.0.1');
    const httpsConfig = this.activeProtocol === 'https'
      ? { enable: true }
      : config.get<HttpsConfig>('liveServer.settings.https', { enable: false });
    const protocol = this.activeProtocol === 'https' || httpsConfig.enable ? 'https' : 'http';

    // Normalizar host para localhost (0.0.0.0 não funciona em navegadores)
    if (host === '0.0.0.0' || host === '::') {
      host = '127.0.0.1';
    }

    let relativePath = '';
    if (uri?.fsPath && this.rootPath) {
      const relative = path.relative(this.rootPath, uri.fsPath).split(path.sep).join('/');
      if (relative && !relative.startsWith('..')) {
        // Suportar QUALQUER arquivo HTML (não apenas index.html)
        const ext = path.extname(uri.fsPath).toLowerCase();
        if (ext === '.html' || ext === '.htm') {
          relativePath = `/${relative}`;
        }
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

    // Verificar se é arquivo HTML (qualquer nome com extensão .html ou .htm)
    const ext = path.extname(filePath).toLowerCase();
    const isHtmlFile = ext === '.html' || ext === '.htm';

    if (!isHtmlFile) {
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

    // Buscar em múltiplos locais
    const candidates = [
      'index.html',
      path.join('src', 'index.html'),
      path.join('public', 'index.html'),
      path.join('dist', 'index.html'),
      path.join('build', 'index.html'),
    ];

    this.log(`🔍 Procurando index.html em: ${this.rootPath}`, 'info');

    for (const candidate of candidates) {
      const candidatePath = path.join(this.rootPath, candidate);
      if (await this.fileExists(candidatePath)) {
        this.log(`✅ index.html encontrado: ${candidate}`, 'info');
        return candidatePath;
      }
    }

    this.log(`⚠️  Nenhum index.html encontrado nos locais padrão`, 'warn');
    return null;
  }

  private getDefaultHtml(): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CLAW Live Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 600px;
    }
    h1 { color: #333; margin-bottom: 16px; font-size: 32px; }
    p { color: #666; line-height: 1.6; margin-bottom: 20px; }
    .info {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      border-radius: 8px;
      text-align: left;
      margin: 20px 0;
      color: #333;
    }
    .highlight { color: #667eea; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 CLAW Live Server</h1>
    <p>Servidor iniciado com sucesso!</p>
    <div class="info">
      <p><span class="highlight">✓ Servidor ativo</span></p>
      <p>Nenhum arquivo <code>index.html</code> foi encontrado nesta workspace.</p>
      <p style="margin-top: 12px; font-size: 14px;">
        Crie um arquivo <code>index.html</code> na raiz da seu projeto ou em uma das pastas:
        <code>src/</code>, <code>public/</code>, <code>dist/</code>, <code>build/</code>
      </p>
    </div>
    <p style="font-size: 14px; color: #999; margin-top: 30px;">
      O navegador será recarregado automaticamente quando você salvar arquivos.
    </p>
  </div>
</body>
</html>`;
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

    // Script melhorado com debug e retry automático
    return `(function() {
      let reconnectAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 30;

      function connect() {
        try {
          const wsUrl = '${protocol}://${sanitizedHost}:${port}${RELOAD_WS_PATH}';
          console.log('[CLAW IA] 🔌 Tentando conectar em:', wsUrl);
          const connection = new WebSocket(wsUrl);

          connection.onopen = function() {
            reconnectAttempts = 0;
            console.log('[CLAW IA] ✅ Conectado ao Live Server');
            console.log('[CLAW IA] 👂 Aguardando mudanças de arquivo...');
          };

          // Ouve 'reload' do servidor
          connection.onmessage = function(event) {
            console.log('[CLAW IA] 📨 Mensagem recebida:', event.data);
            if (event.data === 'reload') {
              console.log('[CLAW IA] 🔄 Alteração detectada! Atualizando página em 100ms...');
              setTimeout(function() {
                console.log('[CLAW IA] 🚀 Recarregando página...');
                window.location.reload();
              }, 100);
            }
          };

          connection.onerror = function(error) {
            console.error('[CLAW IA] ❌ Erro de conexão WebSocket:', error);
          };

          connection.onclose = function() {
            console.log('[CLAW IA] 🔌 Desconectado do servidor');
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              console.log('[CLAW IA] 🔄 Reconectando... (tentativa ' + reconnectAttempts + '/' + MAX_RECONNECT_ATTEMPTS + ')');
              setTimeout(connect, 2000);
            }
          };
        } catch (error) {
          console.error('[CLAW IA] ❌ Erro ao conectar:', error);
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(connect, 2000);
          }
        }
      }

      // Inicia a conexão imediatamente
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          console.log('[CLAW IA] 🚀 Live Reload ativo (Inicializado)');
          connect();
        });
      } else {
        console.log('[CLAW IA] 🚀 Live Reload ativo (Imediato)');
        connect();
      }
    })();`;
  }

  public broadcastReload(fileExtension?: string) {
    if (!this.wsServer) {
      this.log('⚠️  WebSocket server não disponível', 'warn');
      return;
    }

    let clientsNotified = 0;

    // Enviar 'reload' para cada cliente conectado
    this.wsServer.clients.forEach(client => {
      // readyState 1 significa que a conexão está aberta
      if (client.readyState === 1) {
        try {
          client.send('reload'); // Simples, universal
          clientsNotified++;
        } catch (error) {
          this.log(`❌ Erro ao enviar reload: ${error}`, 'error');
        }
      }
    });

    if (clientsNotified > 0) {
      this.log(`📡 Sinal de recarregamento enviado para ${clientsNotified} navegador(es)`, 'info');
    } else {
      this.log('⚠️  Nenhum navegador conectado para receber reload', 'warn');
    }
  }
}

