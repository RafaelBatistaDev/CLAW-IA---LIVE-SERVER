import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

export class SecurityValidator {
  /**
   * Valida se um path não contém path traversal
   * @param rootPath - Pasta base da extensão
   * @param requestedPath - Path solicitado
   * @returns boolean - true se seguro, false se tentativa de escape
   */
  static validatePathTraversal(rootPath: string, requestedPath: string): boolean {
    try {
      // Resolver o path completo
      const resolvedPath = path.resolve(rootPath, requestedPath);
      
      // Normalizar ambos os paths
      const normalizedRoot = path.normalize(path.resolve(rootPath));
      const normalizedPath = path.normalize(resolvedPath);
      
      // Verificar se o path resolvido está dentro da raiz
      return normalizedPath.startsWith(normalizedRoot + path.sep) || 
             normalizedPath === normalizedRoot;
    } catch {
      return false;
    }
  }

  /**
   * Valida hostname
   * @param host - Hostname a validar
   * @returns boolean - true se válido
   */
  static validateHost(host: string): boolean {
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
  static validatePort(port: number): boolean {
    return Number.isInteger(port) && port >= 1024 && port <= 65535;
  }

  /**
   * Sanitiza string para uso em script JavaScript
   * @param input - String a sanitizar
   * @returns string - Sanitizada
   */
  static sanitizeForScript(input: string): string {
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
  static sanitizeForHTML(input: string): string {
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
  static validateFileExtension(filePath: string, allowedExtensions: string[]): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return allowedExtensions.includes(ext);
  }
}

export class SecurityMiddleware {
  /**
   * Middleware Express para validar e sanitizar paths
   */
  static pathTraversalMiddleware(rootPath: string) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Remove X-Frame-Options — ele conflita com frame-ancestors do CSP
    // Os dois juntos causam comportamento imprevisível em browsers modernos

    // Prevenir MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Ativar XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // CSP — permite iframe do webview VSCode E acesso direto no navegador externo
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'wasm-unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "frame-ancestors 'self' vscode-webview: http://127.0.0.1:* http://localhost:*"
    );

    next();
  };
}
}
