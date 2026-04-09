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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
const os_1 = __importDefault(require("os"));
const express_http_proxy_1 = __importDefault(require("express-http-proxy"));
const RELOAD_ROUTE = '/__live-server-plus-plus/reload.js';
class LiveServer {
    constructor(logger) {
        this.app = null;
        this.server = null;
        this.wsServer = null;
        this.watcher = null;
        this.rootPath = null;
        this.logger = null;
        this.debounceTimer = null;
        this.changeTracker = new Map(); // Track file changes
        this.logger = logger || null;
    }
    setLogger(logger) {
        this.logger = logger;
    }
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
        const logMessage = `[${timestamp}] ${prefix} ${message}`;
        if (this.logger) {
            this.logger.appendLine(logMessage);
        }
        console.log(logMessage);
    }
    isRunning() {
        return !!this.server;
    }
    isPortAvailable(port) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const testServer = http_1.default.createServer();
                testServer.once('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        this.log(`Porta ${port} já está em uso`, 'warn');
                        resolve(false);
                    }
                    else {
                        this.log(`Erro ao verificar porta: ${error.message}`, 'error');
                        resolve(false);
                    }
                });
                testServer.once('listening', () => {
                    testServer.close();
                    resolve(true);
                });
                testServer.listen(port, 'localhost');
            });
        });
    }
    getLocalIpAddress() {
        const interfaces = os_1.default.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return 'localhost';
    }
    readHttpsConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = vscode.workspace.getConfiguration();
            const httpsConfig = config.get('liveServer.settings.https', { enable: false });
            if (!httpsConfig.enable || !httpsConfig.cert || !httpsConfig.key) {
                this.log('Usando certificado SSL auto-assinado', 'info');
                return {};
            }
            try {
                const certPath = httpsConfig.cert.replace('${workspaceFolder}', this.rootPath || '');
                const keyPath = httpsConfig.key.replace('${workspaceFolder}', this.rootPath || '');
                if (!(yield this.fileExists(certPath))) {
                    this.log(`Certificado não encontrado: ${certPath}`, 'warn');
                    return {};
                }
                if (!(yield this.fileExists(keyPath))) {
                    this.log(`Chave privada não encontrada: ${keyPath}`, 'warn');
                    return {};
                }
                const cert = yield fs_1.default.promises.readFile(certPath, 'utf8');
                const key = yield fs_1.default.promises.readFile(keyPath, 'utf8');
                this.log('Certificado HTTPS carregado com sucesso', 'info');
                return { cert, key };
            }
            catch (error) {
                this.log(`Erro ao ler certificado HTTPS: ${error}`, 'error');
                return {};
            }
        });
    }
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_1.default.promises.access(filePath, fs_1.default.constants.R_OK);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    start(uri) {
        return __awaiter(this, void 0, void 0, function* () {
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
            // Ler configurações com fallback para nova API
            let port = config.get('liveServer.settings.port', config.get('liveServerPlusPlus.port', 5500));
            let host = config.get('liveServer.settings.host', config.get('liveServerPlusPlus.host', '127.0.0.1'));
            const useLocalIp = config.get('liveServer.settings.useLocalIp', false);
            const noBrowser = config.get('liveServer.settings.noBrowser', false);
            const openBrowser = config.get('liveServer.settings.openBrowser', !noBrowser);
            const browser = config.get('liveServer.settings.customBrowser', '') ||
                config.get('liveServerPlusPlus.browser', '');
            const advanceBrowser = config.get('liveServer.settings.advanceCustomBrowserCmdLine', '');
            const root = config.get('liveServer.settings.root', '/');
            const corsEnabled = config.get('liveServer.settings.cors', config.get('liveServerPlusPlus.enableCORS', false));
            const customHeaders = config.get('liveServer.settings.headers', {});
            const fullReload = config.get('liveServer.settings.fullReload', false);
            const waitMs = config.get('liveServer.settings.wait', 100);
            const reloadTag = config.get('liveServer.settings.reloadTag', 'body');
            const useWebExt = config.get('liveServer.settings.useWebExt', false);
            const ignoreFiles = config.get('liveServer.settings.ignoreFiles', config.get('liveServerPlusPlus.ignoreFiles', ['**/node_modules/**', '**/.git/**']));
            const httpsConfig = config.get('liveServer.settings.https', { enable: false });
            const proxyConfig = config.get('liveServer.settings.proxy', { enable: false, baseUri: '/', proxyUri: 'http://localhost/' });
            const mounts = config.get('liveServer.settings.mount', []);
            const entryFile = config.get('liveServer.settings.file', '');
            // Ajustar host para IP local se necessário
            if (useLocalIp && host === 'localhost') {
                host = this.getLocalIpAddress();
                this.log(`Usando IP local: ${host}`, 'info');
            }
            // Handle random port
            if (port === 0) {
                port = Math.floor(Math.random() * (9999 - 3000) + 3000);
                this.log(`Porta aleatória gerada: ${port}`, 'info');
            }
            // Aplicar root path
            let finalRootPath = this.rootPath;
            if (root && root !== '/') {
                finalRootPath = path_1.default.join(finalRootPath, root);
                if (!(yield this.fileExists(finalRootPath))) {
                    this.log(`Root path não existe: ${finalRootPath}`, 'error');
                    vscode.window.showErrorMessage(`Root path não existe: ${root}`);
                    return;
                }
                this.log(`Root path customizado: ${finalRootPath}`, 'info');
            }
            this.rootPath = finalRootPath;
            // Validar configurações antes de iniciar
            if (!security_1.SecurityValidator.validatePort(port)) {
                this.log(`Porta inválida: ${port}`, 'error');
                vscode.window.showErrorMessage(`Porta inválida: ${port}. Use uma porta entre 1024 e 65535.`);
                return;
            }
            if (!security_1.SecurityValidator.validateHost(host)) {
                this.log(`Host inválido: ${host}`, 'error');
                vscode.window.showErrorMessage(`Host inválido: ${host}. Use localhost, 127.0.0.1 ou um hostname válido.`);
                return;
            }
            // Verificar se a porta está disponível
            this.log(`Verificando disponibilidade da porta ${port}...`, 'info');
            const portAvailable = yield this.isPortAvailable(port);
            if (!portAvailable) {
                this.log(`Falha ao iniciar: porta ${port} não está disponível`, 'error');
                vscode.window.showErrorMessage(`Porta ${port} já está em uso. Mude a porta nas configurações e tente novamente.`);
                return;
            }
            this.log(`Porta ${port} disponível`, 'info');
            this.app = (0, express_1.default)();
            // Adicionar middlewares de segurança
            this.log('Configurando middlewares de segurança...', 'info');
            this.app.use(security_1.SecurityMiddleware.securityHeadersMiddleware());
            this.app.use(security_1.SecurityMiddleware.pathTraversalMiddleware(this.rootPath));
            // Adicionar custom headers
            if (Object.keys(customHeaders).length > 0) {
                this.log('Adicionando headers customizados', 'info');
                this.app.use((req, res, next) => {
                    Object.entries(customHeaders).forEach(([key, value]) => {
                        res.setHeader(key, value);
                    });
                    next();
                });
            }
            // Adicionar CORS
            if (corsEnabled) {
                this.log('CORS habilitado', 'info');
                this.app.use((req, res, next) => {
                    res.header('Access-Control-Allow-Origin', '*');
                    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    next();
                });
            }
            // Adicionar proxies
            if (proxyConfig.enable) {
                this.log(`Proxy configurado: ${proxyConfig.baseUri} -> ${proxyConfig.proxyUri}`, 'info');
                try {
                    this.app.use(proxyConfig.baseUri, (0, express_http_proxy_1.default)(proxyConfig.proxyUri, {
                        proxyReqPathResolver: (req) => {
                            const originalPath = req.originalUrl.substring(proxyConfig.baseUri.length);
                            return originalPath || '/';
                        }
                    }));
                }
                catch (error) {
                    this.log(`Erro ao configurar proxy: ${error}`, 'warn');
                }
            }
            // Adicionar mounts
            if (mounts.length > 0) {
                this.log(`Montando ${mounts.length} diretórios...`, 'info');
                mounts.forEach(([route, dirPath]) => {
                    const fullPath = dirPath.startsWith('/') ? dirPath : path_1.default.join(this.rootPath || '', dirPath);
                    this.app.use(route, express_1.default.static(fullPath));
                    this.log(`  ${route} -> ${fullPath}`, 'info');
                });
            }
            // Middleware de reload script injection
            this.app.use((req, res, next) => this.injectReloadScript(req, res, next, reloadTag, useWebExt));
            this.app.use(express_1.default.static(this.rootPath));
            // Rota para SPA
            this.app.get('*', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
                if (!this.rootPath) {
                    return next();
                }
                if (entryFile) {
                    const entryPath = path_1.default.join(this.rootPath, entryFile);
                    try {
                        const html = yield fs_1.default.promises.readFile(entryPath, 'utf8');
                        return res.send(this.insertReloadScript(html, reloadTag, useWebExt));
                    }
                    catch (_a) {
                        this.log(`Entry file não encontrado: ${entryFile}`, 'warn');
                    }
                }
                const requestedPath = decodeURIComponent(req.path.split('?')[0]);
                const filePath = path_1.default.join(this.rootPath, requestedPath);
                const extension = path_1.default.extname(filePath).toLowerCase();
                const spaExtensions = ['.js', '.jsx', '.ts', '.tsx', '.cshtml', '.razor'];
                if (spaExtensions.includes(extension)) {
                    const indexHtml = yield this.findIndexHtml();
                    if (indexHtml) {
                        const html = yield fs_1.default.promises.readFile(indexHtml, 'utf8');
                        return res.send(this.insertReloadScript(html, reloadTag, useWebExt));
                    }
                }
                if (requestedPath === '/' || !path_1.default.extname(requestedPath)) {
                    const indexHtml = yield this.findIndexHtml();
                    if (indexHtml) {
                        const html = yield fs_1.default.promises.readFile(indexHtml, 'utf8');
                        return res.send(this.insertReloadScript(html, reloadTag, useWebExt));
                    }
                }
                next();
            }));
            const protocol = httpsConfig.enable ? 'https' : 'http';
            const openUrl = `${protocol}://${host}:${port}`;
            // Criar servidor HTTP/HTTPS
            if (httpsConfig.enable) {
                const httpsFiles = yield this.readHttpsConfig();
                const httpsOptions = {
                    cert: httpsFiles.cert || undefined,
                    key: httpsFiles.key || undefined,
                };
                if (!httpsOptions.cert || !httpsOptions.key) {
                    this.log('Gerando certificado SSL auto-assinado...', 'info');
                    const attrs = [{ name: 'commonName', value: host }];
                    const pems = selfsigned_1.default.generate(attrs, { days: 365 });
                    httpsOptions.cert = pems.cert;
                    httpsOptions.key = pems.private;
                }
                this.server = https_1.default.createServer(httpsOptions, this.app);
            }
            else {
                this.server = http_1.default.createServer(this.app);
            }
            this.log('Configurando WebSocket server...', 'info');
            this.wsServer = new ws_1.Server({ server: this.server });
            this.wsServer.on('connection', (socket) => {
                socket.send('connected');
                this.log('Cliente WebSocket conectado', 'info');
            });
            this.log(`Iniciando servidor em ${openUrl}...`, 'info');
            yield new Promise((resolve, reject) => {
                var _a;
                (_a = this.server) === null || _a === void 0 ? void 0 : _a.listen(port, () => {
                    this.log(`✅ Servidor iniciado com sucesso em ${openUrl}`, 'info');
                    resolve();
                });
            });
            this.log('Iniciando file watcher com debounce ' + waitMs + 'ms...', 'info');
            this.watcher = chokidar_1.default.watch(this.rootPath, {
                ignored: ignoreFiles,
                ignoreInitial: true,
                persistent: true
            });
            // Implementar debounce com delay customizável
            this.watcher.on('all', (event, filePath) => {
                const now = Date.now();
                const lastChange = this.changeTracker.get(filePath) || 0;
                // Evitar reloads duplicados para o mesmo arquivo
                if (now - lastChange < 1000) {
                    return;
                }
                this.changeTracker.set(filePath, now);
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                this.debounceTimer = setTimeout(() => {
                    const extension = path_1.default.extname(filePath).toLowerCase();
                    const isCssChange = extension === '.css';
                    this.log(`Detectado: ${event} - ${path_1.default.basename(filePath)}`, 'info');
                    if (isCssChange && !fullReload) {
                        this.log('Reload CSS-only (sem reload completo)', 'info');
                    }
                    else {
                        this.log('Enviando reload completo...', 'info');
                    }
                    this.broadcastReload();
                }, waitMs);
            });
            if (openBrowser && !noBrowser) {
                this.log(`Abrindo navegador com URL ${openUrl}...`, 'info');
                const browserOptions = {};
                if (advanceBrowser) {
                    browserOptions.app = advanceBrowser;
                }
                else if (browser) {
                    browserOptions.app = { name: browser };
                }
                yield (0, open_1.default)(openUrl, browserOptions).catch(error => {
                    this.log(`Erro ao abrir navegador: ${error.message}`, 'warn');
                });
            }
            this.log(`CLAW IA - LIVE SERVER está pronto em ${openUrl}`, 'info');
            if (!config.get('liveServer.settings.donotShowInfoMsg', false)) {
                vscode.window.showInformationMessage(`✅ Live Server iniciado em ${openUrl}`);
            }
        });
    }
    stop() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
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
            yield new Promise(resolve => {
                var _a;
                (_a = this.server) === null || _a === void 0 ? void 0 : _a.close(() => resolve());
            });
            (_a = this.watcher) === null || _a === void 0 ? void 0 : _a.close();
            (_b = this.wsServer) === null || _b === void 0 ? void 0 : _b.close();
            this.server = null;
            this.wsServer = null;
            this.watcher = null;
            this.app = null;
            this.rootPath = null;
            this.log('✅ CLAW IA - LIVE SERVER parado com sucesso', 'info');
            vscode.window.showInformationMessage('CLAW IA - LIVE SERVER parado.');
        });
    }
    open(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.server) {
                yield this.start(uri);
            }
            if (!this.server || !this.rootPath) {
                return;
            }
            const url = this.buildUrl(uri);
            yield (0, open_1.default)(url);
            vscode.window.showInformationMessage(`Abrindo CLAW IA - LIVE SERVER em ${url}`);
        });
    }
    getWorkspacePath(uri) {
        var _a;
        const folder = uri
            ? vscode.workspace.getWorkspaceFolder(uri)
            : (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        return (folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) || null;
    }
    buildUrl(uri) {
        const config = vscode.workspace.getConfiguration();
        const port = config.get('liveServerPlusPlus.port', 5500);
        const host = config.get('liveServerPlusPlus.host', 'localhost');
        const protocol = config.get('liveServerPlusPlus.useHttps', false) ? 'https' : 'http';
        let relativePath = '';
        if ((uri === null || uri === void 0 ? void 0 : uri.fsPath) && this.rootPath) {
            const relative = path_1.default.relative(this.rootPath, uri.fsPath).split(path_1.default.sep).join('/');
            if (relative && !relative.startsWith('..')) {
                relativePath = `/${relative}`;
            }
        }
        return `${protocol}://${host}:${port}${relativePath}`;
    }
    injectReloadScript(req, res, next, reloadTag, useWebExt = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.rootPath) {
                next();
                return;
            }
            if (req.path === RELOAD_ROUTE) {
                res.type('application/javascript').send(this.getReloadScript(useWebExt));
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
                const html = yield fs_1.default.promises.readFile(filePath, 'utf8');
                const injected = this.insertReloadScript(html, reloadTag, useWebExt);
                res.send(injected);
            }
            catch (_a) {
                next();
            }
        });
    }
    findIndexHtml() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.rootPath) {
                return null;
            }
            const candidates = ['index.html', path_1.default.join('src', 'index.html')];
            for (const candidate of candidates) {
                const candidatePath = path_1.default.join(this.rootPath, candidate);
                if (yield this.exists(candidatePath)) {
                    return candidatePath;
                }
            }
            return null;
        });
    }
    exists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_1.default.promises.access(filePath, fs_1.default.constants.R_OK);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    insertReloadScript(html, reloadTag, useWebExt = false) {
        // Se estiver usando Web Extension, não injeta script
        if (useWebExt) {
            return html;
        }
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
    getReloadScript(useWebExt = false) {
        const config = vscode.workspace.getConfiguration();
        let port = config.get('liveServer.settings.port', config.get('liveServerPlusPlus.port', 5500));
        let host = config.get('liveServer.settings.host', config.get('liveServerPlusPlus.host', 'localhost'));
        const useLocalIp = config.get('liveServer.settings.useLocalIp', false);
        const useHttpsConfig = config.get('liveServer.settings.https', { enable: false });
        // Se Web Extension está ativada, retorna script vazio
        if (useWebExt) {
            return `console.log('[CLAW IA] Live Reload controlado pela Web Extension');`;
        }
        // Validar configurações
        if (!security_1.SecurityValidator.validatePort(port)) {
            throw new Error(`Porta inválida: ${port}`);
        }
        if (!security_1.SecurityValidator.validateHost(host)) {
            throw new Error(`Host inválido: ${host}`);
        }
        if (useLocalIp && host === 'localhost') {
            host = this.getLocalIpAddress();
        }
        const protocol = useHttpsConfig.enable ? 'wss' : 'ws';
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
        var _a;
        (_a = this.wsServer) === null || _a === void 0 ? void 0 : _a.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send('reload');
            }
        });
    }
}
exports.LiveServer = LiveServer;
//# sourceMappingURL=server.js.map