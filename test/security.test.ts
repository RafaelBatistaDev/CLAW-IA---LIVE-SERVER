import { SecurityValidator } from '../src/security';

describe('SecurityValidator - Testes de Segurança', () => {
  const rootPath = '/home/user/project';

  describe('validatePathTraversal', () => {
    test('deve aceitar paths seguros', () => {
      expect(SecurityValidator.validatePathTraversal(rootPath, 'index.html')).toBe(true);
      expect(SecurityValidator.validatePathTraversal(rootPath, 'src/app.js')).toBe(true);
      expect(SecurityValidator.validatePathTraversal(rootPath, '/src/app.js')).toBe(true);
      expect(SecurityValidator.validatePathTraversal(rootPath, 'css/style.css')).toBe(true);
    });

    test('deve rejeitar path traversal com ../', () => {
      expect(SecurityValidator.validatePathTraversal(rootPath, '../../../etc/passwd')).toBe(false);
      expect(SecurityValidator.validatePathTraversal(rootPath, '../../.ssh/id_rsa')).toBe(false);
      expect(SecurityValidator.validatePathTraversal(rootPath, 'src/../../etc/passwd')).toBe(false);
    });

    test('deve rejeitar path traversal com ..\\\\', () => {
      expect(SecurityValidator.validatePathTraversal(rootPath, '..\\..\\..\\windows\\system32')).toBe(false);
      expect(SecurityValidator.validatePathTraversal(rootPath, '..\\..\\test')).toBe(false);
    });

    test('deve rejeitar paths absolutos fora da root', () => {
      expect(SecurityValidator.validatePathTraversal(rootPath, '/etc/passwd')).toBe(false);
      expect(SecurityValidator.validatePathTraversal(rootPath, '/root/.ssh/id_rsa')).toBe(false);
      expect(SecurityValidator.validatePathTraversal(rootPath, 'C:\\\\windows\\\\system32')).toBe(false);
    });
  });

  describe('validateHost', () => {
    test('deve aceitar localhost', () => {
      expect(SecurityValidator.validateHost('localhost')).toBe(true);
      expect(SecurityValidator.validateHost('127.0.0.1')).toBe(true);
      expect(SecurityValidator.validateHost('::1')).toBe(true);
    });

    test('deve aceitar hostnames válidos', () => {
      expect(SecurityValidator.validateHost('example.com')).toBe(true);
      expect(SecurityValidator.validateHost('sub.example.com')).toBe(true);
      expect(SecurityValidator.validateHost('my-server')).toBe(true);
      expect(SecurityValidator.validateHost('server123')).toBe(true);
    });

    test('deve aceitar IPs válidos', () => {
      expect(SecurityValidator.validateHost('192.168.1.1')).toBe(true);
      expect(SecurityValidator.validateHost('10.0.0.1')).toBe(true);
      expect(SecurityValidator.validateHost('172.16.0.1')).toBe(true);
    });

    test('deve rejeitar hosts inválidos', () => {
      expect(SecurityValidator.validateHost('...')).toBe(false);
      expect(SecurityValidator.validateHost('256.256.256.256')).toBe(false);
      expect(SecurityValidator.validateHost('$(whoami)')).toBe(false);
      expect(SecurityValidator.validateHost('`id`')).toBe(false);
      expect(SecurityValidator.validateHost(''; DROP TABLE users; --')).toBe(false);
    });

    test('deve rejeitar IPs inválidos', () => {
      expect(SecurityValidator.validateHost('256.1.1.1')).toBe(false);
      expect(SecurityValidator.validateHost('1.1.1.256')).toBe(false);
      expect(SecurityValidator.validateHost('1.1.1')).toBe(false);
    });
  });

  describe('validatePort', () => {
    test('deve aceitar portas válidas', () => {
      expect(SecurityValidator.validatePort(1024)).toBe(true);
      expect(SecurityValidator.validatePort(3000)).toBe(true);
      expect(SecurityValidator.validatePort(5500)).toBe(true);
      expect(SecurityValidator.validatePort(8080)).toBe(true);
      expect(SecurityValidator.validatePort(65535)).toBe(true);
    });

    test('deve rejeitar portas reservadas', () => {
      expect(SecurityValidator.validatePort(80)).toBe(false);
      expect(SecurityValidator.validatePort(443)).toBe(false);
      expect(SecurityValidator.validatePort(22)).toBe(false);
      expect(SecurityValidator.validatePort(1023)).toBe(false);
    });

    test('deve rejeitar portas fora do range', () => {
      expect(SecurityValidator.validatePort(0)).toBe(false);
      expect(SecurityValidator.validatePort(-1)).toBe(false);
      expect(SecurityValidator.validatePort(65536)).toBe(false);
      expect(SecurityValidator.validatePort(99999)).toBe(false);
    });

    test('deve rejeitar valores não-inteiros', () => {
      expect(SecurityValidator.validatePort(3000.5)).toBe(false);
      expect(SecurityValidator.validatePort(NaN)).toBe(false);
    });
  });

  describe('sanitizeForScript', () => {
    test('deve sanitizar aspas simples', () => {
      const input = "It's a test";
      const result = SecurityValidator.sanitizeForScript(input);
      expect(result).toBe("It\\'s a test");
    });

    test('deve sanitizar aspas duplas', () => {
      const input = 'Say "hello"';
      const result = SecurityValidator.sanitizeForScript(input);
      expect(result).toBe('Say \\"hello\\"');
    });

    test('deve sanitizar injeção de script', () => {
      const dangerous = "'; alert('XSS'); //";
      const result = SecurityValidator.sanitizeForScript(dangerous);
      expect(result).not.toContain("alert('XSS')");
      expect(result).toContain("\\'");
    });

    test('deve sanitizar quebras de linha', () => {
      const input = 'line1\\nline2';
      const result = SecurityValidator.sanitizeForScript(input);
      expect(result).toBe('line1\\\\nline2');
    });

    test('deve sanitizar tags HTML', () => {
      const input = '<script>alert("XSS")</script>';\n      const result = SecurityValidator.sanitizeForScript(input);\n      expect(result).not.toContain('<script>');\n      expect(result).toContain('\\\\x3c');\n    });\n  });\n\n  describe('sanitizeForHTML', () => {\n    test('deve sanitizar HTML entities', () => {\n      expect(SecurityValidator.sanitizeForHTML('<')).toBe('&lt;');\n      expect(SecurityValidator.sanitizeForHTML('>')).toBe('&gt;');\n      expect(SecurityValidator.sanitizeForHTML('&')).toBe('&amp;');\n      expect(SecurityValidator.sanitizeForHTML('\"')).toBe('&quot;');\n      expect(SecurityValidator.sanitizeForHTML(\"'\")).toBe('&#x27;');\n    });\n\n    test('deve sanitizar tags perigosas', () => {\n      const dangerous = '<img src=x onerror=\"alert(\\'XSS\\')\"/>';\n      const result = SecurityValidator.sanitizeForHTML(dangerous);\n      expect(result).not.toContain('<');\n      expect(result).toContain('&lt;');\n    });\n  });\n\n  describe('validateFileExtension', () => {\n    test('deve aceitar extensões permitidas', () => {\n      const allowed = ['.html', '.htm'];\n      expect(SecurityValidator.validateFileExtension('index.html', allowed)).toBe(true);\n      expect(SecurityValidator.validateFileExtension('page.htm', allowed)).toBe(true);\n      expect(SecurityValidator.validateFileExtension('src/page.HTML', allowed)).toBe(true);\n    });\n\n    test('deve rejeitar extensões não permitidas', () => {\n      const allowed = ['.html', '.htm'];\n      expect(SecurityValidator.validateFileExtension('script.js', allowed)).toBe(false);\n      expect(SecurityValidator.validateFileExtension('style.css', allowed)).toBe(false);\n      expect(SecurityValidator.validateFileExtension('image.png', allowed)).toBe(false);\n      expect(SecurityValidator.validateFileExtension('file.exe', allowed)).toBe(false);\n    });\n  });\n});\n