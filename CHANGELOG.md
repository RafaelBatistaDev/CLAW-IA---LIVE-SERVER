# Changelog

## [1.0.0] - 2026-04-09

### Adicionado
- Validação de segurança contra path traversal attacks
- Proteção contra XSS e script injection
- Sanitização contextual (HTML e JavaScript)
- Security headers HTTP (X-Frame-Options, CSP, etc)
- Validação de host e porta
- Whitelist de extensões de arquivo (.html, .htm)
- Teste suite com 20+ casos de teste de segurança
- Rate limiting infrastructure (express-rate-limit)

### Melhorado
- Código de injeção de script mais robusto
- Validação de entrada mais rigorosa
- Tratamento de erros aprimorado

### Corrigido
- Path traversal vulnerabilities
- CORS settings now more restrictive by default
- XSS vulnerabilities in script injection
- SPA path traversal issues

### Dependências
- Adicionado: express-rate-limit@^6.7.0

## Histórico de Versões

### v1.0.0 - 2026-04-09
Versão inicial com recursos completos de segurança.
