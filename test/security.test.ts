import * as assert from 'assert';
import { SecurityValidator } from '../src/security';

suite('Security Tests', () => {
  suite('validatePathTraversal', () => {
    test('should allow safe paths', () => {
      const rootPath = '/home/user/project';
      assert.strictEqual(
        SecurityValidator.validatePathTraversal(rootPath, 'index.html'),
        true
      );
    });

    test('should block path traversal', () => {
      const rootPath = '/home/user/project';
      assert.strictEqual(
        SecurityValidator.validatePathTraversal(rootPath, '../../../etc/passwd'),
        false
      );
    });
  });

  suite('validateHost', () => {
    test('should allow localhost', () => {
      assert.strictEqual(SecurityValidator.validateHost('localhost'), true);
    });

    test('should block command injection', () => {
      assert.strictEqual(
        SecurityValidator.validateHost('localhost; rm -rf /'),
        false
      );
    });
  });

  suite('validatePort', () => {
    test('should allow valid ports', () => {
      assert.strictEqual(SecurityValidator.validatePort(5500), true);
    });

    test('should block privileged ports', () => {
      assert.strictEqual(SecurityValidator.validatePort(80), false);
    });
  });

  suite('sanitizeForScript', () => {
    test('should escape quotes', () => {
      const input = 'Hello "World"';
      const result = SecurityValidator.sanitizeForScript(input);
      assert.ok(result !== input);
    });
  });

  suite('sanitizeForHTML', () => {
    test('should encode entities', () => {
      assert.strictEqual(SecurityValidator.sanitizeForHTML('<'), '&lt;');
    });
  });

  suite('validateFileExtension', () => {
    test('should allow HTML files', () => {
      const allowed = ['.html', '.htm'];
      assert.strictEqual(
        SecurityValidator.validateFileExtension('index.html', allowed),
        true
      );
    });

    test('should reject other extensions', () => {
      const allowed = ['.html', '.htm'];
      assert.strictEqual(
        SecurityValidator.validateFileExtension('script.js', allowed),
        false
      );
    });
  });
});
