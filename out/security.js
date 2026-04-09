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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMiddleware = exports.SecurityValidator = void 0;
const path = __importStar(require("path"));
class SecurityValidator {
    /**
     * Valida se um path não contém path traversal
     * @param rootPath - Pasta base da extensão
     * @param requestedPath - Path solicitado
     * @returns boolean - true se seguro, false se tentativa de escape
     */
    static validatePathTraversal(rootPath, requestedPath) {
        try {
            // Resolver o path completo
            const resolvedPath = path.resolve(rootPath, requestedPath);
            // Normalizar ambos os paths
            const normalizedRoot = path.normalize(path.resolve(rootPath));
            const normalizedPath = path.normalize(resolvedPath);
            // Verificar se o path resolvido está dentro da raiz
            return normalizedPath.startsWith(normalizedRoot + path.sep) ||
                normalizedPath === normalizedRoot;
        }
        catch {
            return false;
        }
    }
    /**
     * Valida hostname
     * @param host - Hostname a validar
     * @returns boolean - true se válido
     */
    static validateHost(host) {
        // Padrão para hostname válido
        const hostnamePattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
        // Padrão para IPv4
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        // Localhost cases
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
            return true;
        }
        if (hostnamePattern.test(host)) {
            return true;
        }
        if (ipv4Pattern.test(host)) {
            const parts = host.split('.').map(Number);
            return parts.every(part => part >= 0 && part <= 255);
        }
        return false;
    }
    /**
     * Valida porta
     * @param port - Porta a validar
     * @returns boolean - true se válida
     */
    static validatePort(port) {
        return Number.isInteger(port) && port >= 1024 && port <= 65535;
    }
    /**
     * Sanitiza string para uso em script JavaScript
     * @param input - String a sanitizar
     * @returns string - Sanitizada
     */
    static sanitizeForScript(input) {
        return input
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/</g, '\\x3c')
            .replace(/>/g, '\\x3e');
    }
    /**
     * Sanitiza para HTML attribute
     */
    static sanitizeForHTML(input) {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    /**
     * Valida arquivo por extensão
     */
    static validateFileExtension(filePath, allowedExtensions) {
        const ext = path.extname(filePath).toLowerCase();
        return allowedExtensions.includes(ext);
    }
}
exports.SecurityValidator = SecurityValidator;
class SecurityMiddleware {
    /**
     * Middleware Express para validar e sanitizar paths
     */
    static pathTraversalMiddleware(rootPath) {
        return (req, res, next) => {
            const decodedPath = decodeURIComponent(req.path);
            if (!SecurityValidator.validatePathTraversal(rootPath, decodedPath)) {
                res.status(403).json({
                    error: 'Access Denied',
                    message: 'Path traversal attempt detected'
                });
                return;
            }
            next();
        };
    }
    /**
     * Middleware para validar headers de segurança
     */
    static securityHeadersMiddleware() {
        return (req, res, next) => {
            // Prevenir clickjacking
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            // Prevenir MIME sniffing
            res.setHeader('X-Content-Type-Options', 'nosniff');
            // Ativar XSS protection
            res.setHeader('X-XSS-Protection', '1; mode=block');
            // Content Security Policy
            res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'");
            next();
        };
    }
}
exports.SecurityMiddleware = SecurityMiddleware;
//# sourceMappingURL=security.js.map