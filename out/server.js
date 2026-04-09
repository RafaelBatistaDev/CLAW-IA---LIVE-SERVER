"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveServer = void 0;
const vscode = __importStar(require("vscode"));
const express_1 = __importDefault(require("express"));
const open_1 = __importDefault(require("open"));
const chokidar_1 = __importDefault(require("chokidar"));
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const selfsigned_1 = __importDefault(require("selfsigned"));
const fs_1 = __importDefault(require("fs"));
const security_1 = require("./security");
const RELOAD_ROUTE = '/__live-server-plus-plus/reload.js';
class LiveServer {
    constructor() {
        this.app = null;
        this.server = null;
        this.wsServer = null;
        this.watcher = null;
        this.rootPath = null;
    }
    isRunning() {
        return !!this.server;
    }
    async start(uri) {
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
        const port = config.get('liveServerPlusPlus.port', 5500);
        const host = config.get('liveServerPlusPlus.host', 'localhost');
        const openBrowser = config.get('liveServerPlusPlus.openBrowser', true);
        const browser = config.get('liveServerPlusPlus.browser', '');
        const ignoreFiles = config.get('liveServerPlusPlus.ignoreFiles', ['**/node_modules/**', '**/.git/**']);
        const enableCORS = config.get('liveServerPlusPlus.enableCORS', false);
        const useHttps = config.get('liveServerPlusPlus.useHttps', false);
        const reloadTag = config.get('liveServerPlusPlus.reloadTag', 'body');
        // Validar configurações antes de iniciar
        if (!security_1.SecurityValidator.validatePort(port)) {
            vscode.window.showErrorMessage(`Porta inválida: ${port}. Use uma porta entre 1024 e 65535.`);
            return;
        }
        if (!security_1.SecurityValidator.validateHost(host)) {
            vscode.window.showErrorMessage(`Host inválido: ${host}. Use localhost, 127.0.0.1 ou um hostname válido.`);
            return;
        }
        this.app = (0, express_1.default)();
        // Adicionar middlewares de segurança
        this.app.use(security_1.SecurityMiddleware.securityHeadersMiddleware());
        this.app.use(security_1.SecurityMiddleware.pathTraversalMiddleware(this.rootPath));
        if (enableCORS) {
            this.app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                next();
            });
        }
        this.app.use((req, res, next) => this.injectReloadScript(req, res, next, reloadTag));
        this.app.use(express_1.default.static(this.rootPath));
        this.app.get('*', async (req, res, next) => {
            if (!this.rootPath) {
                return next();
            }
            const requestedPath = decodeURIComponent(req.path.split('?')[0]);
            const filePath = path_1.default.join(this.rootPath, requestedPath);
            const extension = path_1.default.extname(filePath).toLowerCase();
            const spaExtensions = ['.js', '.jsx', '.ts', '.tsx', '.cshtml', '.razor'];
            if (spaExtensions.includes(extension)) {
                const indexHtml = await this.findIndexHtml();
                if (indexHtml) {
                    const html = await fs_1.default.promises.readFile(indexHtml, 'utf8');
                    return res.send(this.insertReloadScript(html, reloadTag));
                }
            }
            if (requestedPath === '/' || !path_1.default.extname(requestedPath)) {
                const indexHtml = await this.findIndexHtml();
                if (indexHtml) {
                    const html = await fs_1.default.promises.readFile(indexHtml, 'utf8');
                    return res.send(this.insertReloadScript(html, reloadTag));
                }
            }
            next();
        });
        const protocol = useHttps ? 'https' : 'http';
        const openUrl = `${protocol}://${host}:${port}`;
        if (useHttps) {
            const attrs = [{ name: 'commonName', value: host }];
            const pems = selfsigned_1.default.generate(attrs, { days: 365 });
            this.server = https_1.default.createServer({ key: pems.private, cert: pems.cert }, this.app);
        }
        else {
            this.server = http_1.default.createServer(this.app);
        }
        this.wsServer = new ws_1.Server({ server: this.server });
        this.wsServer.on('connection', (socket) => {
            socket.send('connected');
        });
        await new Promise((resolve, reject) => {
            this.server?.listen(port, () => {
                resolve();
            });
        });
        this.watcher = chokidar_1.default.watch(this.rootPath, {
            ignored: ignoreFiles,
            ignoreInitial: true,
            persistent: true
        });
        this.watcher.on('all', () => this.broadcastReload());
        if (openBrowser) {
            await (0, open_1.default)(openUrl, { app: browser ? { name: browser } : undefined });
        }
        vscode.window.showInformationMessage(`CLAW IA - LIVE SERVER iniciado em ${openUrl}`);
    }
    async stop() {
        if (!this.server) {
            vscode.window.showInformationMessage('CLAW IA - LIVE SERVER não está rodando.');
            return;
        }
        await new Promise(resolve => {
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
    async open(uri) {
        if (!this.server) {
            await this.start(uri);
        }
        if (!this.server || !this.rootPath) {
            return;
        }
        const url = this.buildUrl(uri);
        await (0, open_1.default)(url);
        vscode.window.showInformationMessage(`Abrindo CLAW IA - LIVE SERVER em ${url}`);
    }
    getWorkspacePath(uri) {
        const folder = uri
            ? vscode.workspace.getWorkspaceFolder(uri)
            : vscode.workspace.workspaceFolders?.[0];
        return folder?.uri.fsPath || null;
    }
    buildUrl(uri) {
        const config = vscode.workspace.getConfiguration();
        const port = config.get('liveServerPlusPlus.port', 5500);
        const host = config.get('liveServerPlusPlus.host', 'localhost');
        const protocol = config.get('liveServerPlusPlus.useHttps', false) ? 'https' : 'http';
        let relativePath = '';
        if (uri?.fsPath && this.rootPath) {
            const relative = path_1.default.relative(this.rootPath, uri.fsPath).split(path_1.default.sep).join('/');
            if (relative && !relative.startsWith('..')) {
                relativePath = `/${relative}`;
            }
        }
        return `${protocol}://${host}:${port}${relativePath}`;
    }
    async injectReloadScript(req, res, next, reloadTag) {
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
        if (!security_1.SecurityValidator.validatePathTraversal(this.rootPath, requestedPath)) {
            res.status(403).json({ error: 'Access Denied' });
            return;
        }
        const filePath = path_1.default.join(this.rootPath, requestedPath === '/' ? 'index.html' : requestedPath);
        // Validar extensão de arquivo
        if (!security_1.SecurityValidator.validateFileExtension(filePath, ['.html', '.htm'])) {
            next();
            return;
        }
        try {
            const html = await fs_1.default.promises.readFile(filePath, 'utf8');
            const injected = this.insertReloadScript(html, reloadTag);
            res.send(injected);
        }
        catch {
            next();
        }
    }
    async findIndexHtml() {
        if (!this.rootPath) {
            return null;
        }
        const candidates = ['index.html', path_1.default.join('src', 'index.html')];
        for (const candidate of candidates) {
            const candidatePath = path_1.default.join(this.rootPath, candidate);
            if (await this.exists(candidatePath)) {
                return candidatePath;
            }
        }
        return null;
    }
    async exists(filePath) {
        try {
            await fs_1.default.promises.access(filePath, fs_1.default.constants.R_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    insertReloadScript(html, reloadTag) {
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
    getReloadScript() {
        const config = vscode.workspace.getConfiguration();
        const port = config.get('liveServerPlusPlus.port', 5500);
        const host = config.get('liveServerPlusPlus.host', 'localhost');
        const useHttps = config.get('liveServerPlusPlus.useHttps', false);
        // Validar configurações
        if (!security_1.SecurityValidator.validatePort(port)) {
            throw new Error(`Porta inválida: ${port}`);
        }
        if (!security_1.SecurityValidator.validateHost(host)) {
            throw new Error(`Host inválido: ${host}`);
        }
        const protocol = useHttps ? 'wss' : 'ws';
        const sanitizedHost = security_1.SecurityValidator.sanitizeForScript(host);
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
    broadcastReload() {
        this.wsServer?.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send('reload');
            }
        });
    }
}
exports.LiveServer = LiveServer;
//# sourceMappingURL=server.js.map