import * as vscode from 'vscode';
import express from 'express';
import open from 'open';
import chokidar from 'chokidar';
import { Server as WsServer } from 'ws';
import path from 'path';
import http from 'http';
import https from 'https';
import selfsigned from 'selfsigned';
import fs from 'fs';
import { SecurityValidator, SecurityMiddleware } from './security';

type ServerInstance = http.Server | https.Server;

const RELOAD_ROUTE = '/__live-server-plus-plus/reload.js';

export class LiveServer {
  private app: express.Express | null = null;
  private server: ServerInstance | null = null;
  private wsServer: WsServer | null = null;
  private watcher: chokidar.FSWatcher | null = null;
  private rootPath: string | null = null;

  public isRunning(): boolean {
    return !!this.server;
  }

  public async start(uri?: vscode.Uri) {
    if (this.server) {
      vscode.window.showWarningMessage('CLAW IA - LIVE SERVER já está rodando!');
      return;
    }

    const workspacePath = this.getWorkspacePath(uri);
    if (!workspacePath) {
      vscode.window.showErrorMessage('Nenhuma workspace aberta para iniciar o CLAW IA - LIVE SERVER.');
      return;
    }

    this.rootPath = workspacePath;

    const config = vscode.workspace.getConfiguration();
    const port = config.get<number>('liveServerPlusPlus.port', 5500);
    const host = config.get<string>('liveServerPlusPlus.host', 'localhost');
    const openBrowser = config.get<boolean>('liveServerPlusPlus.openBrowser', true);
    const browser = config.get<string>('liveServerPlusPlus.browser', '');
    const ignoreFiles = config.get<string[]>('liveServerPlusPlus.ignoreFiles', ['**/node_modules/**', '**/.git/**']);
    const enableCORS = config.get<boolean>('liveServerPlusPlus.enableCORS', false);
    const useHttps = config.get<boolean>('liveServerPlusPlus.useHttps', false);
    const reloadTag = config.get<string>('liveServerPlusPlus.reloadTag', 'body');

    // Validar configurações antes de iniciar
    if (!SecurityValidator.validatePort(port)) {
      vscode.window.showErrorMessage(`Porta inválida: ${port}. Use uma porta entre 1024 e 65535.`);
      return;
    }

    if (!SecurityValidator.validateHost(host)) {
      vscode.window.showErrorMessage(`Host inválido: ${host}. Use localhost, 127.0.0.1 ou um hostname válido.`);
      return;
    }

    this.app = express();

    // Adicionar middlewares de segurança
    this.app.use(SecurityMiddleware.securityHeadersMiddleware());
    this.app.use(SecurityMiddleware.pathTraversalMiddleware(this.rootPath));

    if (enableCORS) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
      });
    }

    this.app.use((req, res, next) => this.injectReloadScript(req, res, next, reloadTag));
    this.app.use(express.static(this.rootPath));

    this.app.get('*', async (req, res, next) => {
      if (!this.rootPath) {
        return next();
      }
      const requestedPath = decodeURIComponent(req.path.split('?')[0]);
      const filePath = path.join(this.rootPath, requestedPath);
      const extension = path.extname(filePath).toLowerCase();
      const spaExtensions = ['.js', '.jsx', '.ts', '.tsx', '.cshtml', '.razor'];

      if (spaExtensions.includes(extension)) {
        const indexHtml = await this.findIndexHtml();
        if (indexHtml) {
          const html = await fs.promises.readFile(indexHtml, 'utf8');
          return res.send(this.insertReloadScript(html, reloadTag));
        }
      }

      if (requestedPath === '/' || !path.extname(requestedPath)) {
        const indexHtml = await this.findIndexHtml();
        if (indexHtml) {
          const html = await fs.promises.readFile(indexHtml, 'utf8');
          return res.send(this.insertReloadScript(html, reloadTag));
        }
      }

      next();
    });

    const protocol = useHttps ? 'https' : 'http';
    const openUrl = `${protocol}://${host}:${port}`;

    if (useHttps) {
      const attrs = [{ name: 'commonName', value: host }];
      const pems = selfsigned.generate(attrs, { days: 365 });
      this.server = https.createServer({ key: pems.private, cert: pems.cert }, this.app);
    } else {
      this.server = http.createServer(this.app);
    }

    this.wsServer = new WsServer({ server: this.server });
    this.wsServer.on('connection', socket => {
      socket.send('connected');
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.listen(port, host, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    this.watcher = chokidar.watch(this.rootPath, {
      ignored: ignoreFiles,
      ignoreInitial: true,
      persistent: true
    });
    this.watcher.on('all', () => this.broadcastReload());

    if (openBrowser) {
      await open(openUrl, { app: browser ? { name: browser } : undefined });
    }

    vscode.window.showInformationMessage(`CLAW IA - LIVE SERVER iniciado em ${openUrl}`);
  }

  public async stop() {
    if (!this.server) {
      vscode.window.showInformationMessage('CLAW IA - LIVE SERVER não está rodando.');
      return;
    }

    await new Promise<void>(resolve => {
      this.server?.close(() => resolve());
    });

    this.watcher?.close();
    this.wsServer?.close();

    this.server = null;
    this.wsServer = null;
    this.watcher = null;
    this.app = null;
    this.rootPath = null;

    vscode.window.showInformationMessage('CLAW IA - LIVE SERVER parado.');
  }

  public async open(uri?: vscode.Uri) {
    if (!this.server) {
      await this.start(uri);
    }
    if (!this.server || !this.rootPath) {
      return;
    }

    const url = this.buildUrl(uri);
    await open(url);
    vscode.window.showInformationMessage(`Abrindo CLAW IA - LIVE SERVER em ${url}`);
  }

  private getWorkspacePath(uri?: vscode.Uri): string | null {
    const folder = uri
      ? vscode.workspace.getWorkspaceFolder(uri)
      : vscode.workspace.workspaceFolders?.[0];
    return folder?.uri.fsPath || null;
  }

  private buildUrl(uri?: vscode.Uri): string {
    const config = vscode.workspace.getConfiguration();
    const port = config.get<number>('liveServerPlusPlus.port', 5500);
    const host = config.get<string>('liveServerPlusPlus.host', 'localhost');
    const protocol = config.get<boolean>('liveServerPlusPlus.useHttps', false) ? 'https' : 'http';

    let relativePath = '';
    if (uri?.fsPath && this.rootPath) {
      const relative = path.relative(this.rootPath, uri.fsPath).split(path.sep).join('/');
      if (relative && !relative.startsWith('..')) {
        relativePath = `/${relative}`;
      }
    }

    return `${protocol}://${host}:${port}${relativePath}`;
  }

  private async injectReloadScript(req: express.Request, res: express.Response, next: express.NextFunction, reloadTag: string) {
    if (!this.rootPath) {
      next();
      return;
    }

    if (req.path === RELOAD_ROUTE) {
      res.type('application/javascript').send(this.getReloadScript());
      return;
    }

    const requestedPath = decodeURIComponent(req.path.split('?')[0]);
    
    // Validar path traversal
    if (!SecurityValidator.validatePathTraversal(this.rootPath, requestedPath)) {
      res.status(403).json({ error: 'Access Denied' });
      return;
    }

    const filePath = path.join(
      this.rootPath, 
      requestedPath === '/' ? 'index.html' : requestedPath
    );

    // Validar extensão de arquivo
    if (!SecurityValidator.validateFileExtension(filePath, ['.html', '.htm'])) {
      next();
      return;
    }

    try {
      const html = await fs.promises.readFile(filePath, 'utf8');
      const injected = this.insertReloadScript(html, reloadTag);
      res.send(injected);
    } catch {
      next();
    }
  }

  private async findIndexHtml(): Promise<string | null> {
    if (!this.rootPath) {
      return null;
    }
    const candidates = ['index.html', path.join('src', 'index.html')];
    for (const candidate of candidates) {
      const candidatePath = path.join(this.rootPath, candidate);
      if (await this.exists(candidatePath)) {
        return candidatePath;
      }
    }
    return null;
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private insertReloadScript(html: string, reloadTag: string): string {
    const scriptTag = `<script src="${RELOAD_ROUTE}"></script>`;
    if (reloadTag === 'head') {
      if (html.includes('<head')) {
        return html.replace(/<head([^>]*)>/i, match => `${match}${scriptTag}`);
      }
    }
    if (html.includes('</body>')) {
      return html.replace(/<\/body>/i, `${scriptTag}</body>`);
    }
    return html + scriptTag;
  }

  private getReloadScript(): string {
    const config = vscode.workspace.getConfiguration();
    const port = config.get<number>('liveServerPlusPlus.port', 5500);
    const host = config.get<string>('liveServerPlusPlus.host', 'localhost');
    const useHttps = config.get<boolean>('liveServerPlusPlus.useHttps', false);

    // Validar configurações
    if (!SecurityValidator.validatePort(port)) {
      throw new Error(`Porta inválida: ${port}`);
    }

    if (!SecurityValidator.validateHost(host)) {
      throw new Error(`Host inválido: ${host}`);
    }

    const protocol = useHttps ? 'wss' : 'ws';
    const sanitizedHost = SecurityValidator.sanitizeForScript(host);
    
    // Script seguro com sanitização
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
      if (client.readyState === 1) {
        client.send('reload');
      }
    });
  }
}
