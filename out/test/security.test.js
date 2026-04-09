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
const assert = __importStar(require("assert"));
const security_1 = require("../src/security");
suite('Security Tests', () => {
    suite('validatePathTraversal', () => {
        test('should allow safe paths', () => {
            const rootPath = '/home/user/project';
            assert.strictEqual(security_1.SecurityValidator.validatePathTraversal(rootPath, 'index.html'), true);
        });
        test('should block path traversal', () => {
            const rootPath = '/home/user/project';
            assert.strictEqual(security_1.SecurityValidator.validatePathTraversal(rootPath, '../../../etc/passwd'), false);
        });
    });
    suite('validateHost', () => {
        test('should allow localhost', () => {
            assert.strictEqual(security_1.SecurityValidator.validateHost('localhost'), true);
        });
        test('should block command injection', () => {
            assert.strictEqual(security_1.SecurityValidator.validateHost('localhost; rm -rf /'), false);
        });
    });
    suite('validatePort', () => {
        test('should allow valid ports', () => {
            assert.strictEqual(security_1.SecurityValidator.validatePort(5500), true);
        });
        test('should block privileged ports', () => {
            assert.strictEqual(security_1.SecurityValidator.validatePort(80), false);
        });
    });
    suite('sanitizeForScript', () => {
        test('should escape quotes', () => {
            const input = 'Hello "World"';
            const result = security_1.SecurityValidator.sanitizeForScript(input);
            assert.ok(result !== input);
        });
    });
    suite('sanitizeForHTML', () => {
        test('should encode entities', () => {
            assert.strictEqual(security_1.SecurityValidator.sanitizeForHTML('<'), '&lt;');
        });
    });
    suite('validateFileExtension', () => {
        test('should allow HTML files', () => {
            const allowed = ['.html', '.htm'];
            assert.strictEqual(security_1.SecurityValidator.validateFileExtension('index.html', allowed), true);
        });
        test('should reject other extensions', () => {
            const allowed = ['.html', '.htm'];
            assert.strictEqual(security_1.SecurityValidator.validateFileExtension('script.js', allowed), false);
        });
    });
});
//# sourceMappingURL=security.test.js.map