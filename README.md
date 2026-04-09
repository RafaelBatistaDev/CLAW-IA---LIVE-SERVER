# CLAW IA - LIVE SERVER

## Visão Geral

**CLAW IA - LIVE SERVER** é uma extensão poderosa e intuitiva para Visual Studio Code que oferece um servidor local de desenvolvimento com reload automático de páginas. Perfeita para desenvolvedores que trabalham com HTML, CSS, JavaScript, TypeScript, React, Vite e Blazor.

## Características Principais

✨ **Desenvolvimento Rápido**

- Servidor local otimizado para máximo desempenho
- Live reload automático ao salvar arquivos
- Suporte para páginas estáticas e dinâmicas

🎯 **Interface Intuitiva**

- Ativa/desativa com um clique na barra de status
- Menu de contexto no editor e explorador
- Paleta de comandos integrada

🔧 **Altamente Configurável**

- Porta customizável (padrão: 5500)
- Suporte a CORS opcional
- Injeção automática de script de reload
- Múltiplos hosts suportados (localhost, 127.0.0.1, etc.)

🚀 **Suporte a Múltiplos Frameworks**

- HTML/CSS/JavaScript puro
- React e Vite
- Blazor (`.cshtml` / `.razor`)
- TypeScript/TSX

📦 **Multi-Workspace**

- Suporte completo a workspaces com múltiplas pastas
- Configuração isolada por workspace

🌐 **HTTPS Suportado**

- Certificados autoassinados
- Perfeito para testes SSL/TLS locais

🔒 **Segurança em Primeiro Lugar (v1.0.4+)**

- ✅ Proteção contra path traversal attacks
- ✅ Prevenção de injeção XSS
- ✅ Proteção contra script injection
- ✅ Headers de segurança HTTP (CSP, X-Frame-Options)
- ✅ Validação rigorosa de host e porta
- ✅ Whitelist de extensões de arquivo
- ✅ Rate limiting para proteção DDoS
- ✅ Sanitização contextual de entrada/saída

## Instalação

### Via Visual Studio Code Marketplace

1. Abra o VS Code
2. Vá para Extensões (Ctrl+Shift+X / Cmd+Shift+X)
3. Procure por `CLAW IA - LIVE SERVER`
4. Clique em Install

### Via Linha de Comando

```bash
code --install-extension RafaelBatista.claw-ia-live-server
```

### Desenvolvimento Local

```bash
git clone git@github.com:RafaelBatistaDev/CLAW-IA---LIVE-SERVER.git
cd CLAW-IA---LIVE-SERVER
npm install
npm run compile
# Abra a pasta no VS Code e pressione F5 para debug
```

## Quick Start

1. Abra um arquivo HTML em seu projeto
2. Pressione `Alt+L, Alt+O` (Windows/Linux) ou `Cmd+L, Cmd+O` (Mac)
3. O navegador abrirá automaticamente com o servidor rodando
4. Faça alterações no seu código — a página atualiza automaticamente!

## Como Usar

### Via Barra de Status

- Clique no item `CLAW IA - LIVE SERVER` na barra de status para iniciar/parar

### Via Paleta de Comandos

- Pressione `F1` ou `Ctrl+Shift+P`
- Digite `CLAW IA - LIVE SERVER` para ver os comandos disponíveis:
  - `Open With Live Server` — Abre arquivo atual no servidor
  - `Start Server` — Inicia o servidor
  - `Stop Server` — Para o servidor
  - `Toggle Server` — Alterna estado (ligado/desligado)
  - `Open Configuration` — Abre as opções de configuração

### Via Menu de Contexto

- No Editor: clique com o botão direito em um arquivo HTML e selecione `CLAW IA - LIVE SERVER: Open With Live Server`
- No Explorador: clique com o botão direito em um arquivo HTML/HTM e selecione a opção correspondente

## Atalhos de Teclado

| Comando | Windows/Linux | Mac |
| --- | --- | --- |
| Iniciar/Abrir | `Alt+L, Alt+O` | `Cmd+L, Cmd+O` |
| Parar | `Alt+L, Alt+C` | `Cmd+L, Cmd+C` |

Os atalhos podem ser customizados em Keyboard Shortcuts (`Ctrl+K Ctrl+S`).

## Configurações

Acesse as configurações em `File > Preferences > Settings` ou pressione `Ctrl+,` e procure por `CLAW IA`.

| Configuração | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `liveServerPlusPlus.port` | number | `5500` | Porta do servidor |
| `liveServerPlusPlus.host` | string | `localhost` | Nome do host ou IP |
| `liveServerPlusPlus.openBrowser` | boolean | `true` | Abre navegador automaticamente |
| `liveServerPlusPlus.browser` | string | `(vazio)` | Navegador opcional (ex: `firefox`) |
| `liveServerPlusPlus.ignoreFiles` | array | `**/node_modules/**`, `**/.git/**` | Arquivos/pastas ignorados |
| `liveServerPlusPlus.enableCORS` | boolean | `false` | Habilita headers CORS |
| `liveServerPlusPlus.useHttps` | boolean | `false` | Usa HTTPS com certificado autoassinado |
| `liveServerPlusPlus.reloadTag` | string | `body` | Onde injetar script: `body` ou `head` |

### Exemplo de Configuração

```json
{
  "liveServerPlusPlus.port": 8080,
  "liveServerPlusPlus.openBrowser": true,
  "liveServerPlusPlus.ignoreFiles": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**"
  ],
  "liveServerPlusPlus.enableCORS": true
}
```

## Suporte a Frameworks

### React / Vite

A extensão detecta automaticamente projetos React e Vite, servindo `index.html` como ponto de entrada. Funciona com `create-react-app` e `vite`.

### Blazor

Suporta arquivos `.cshtml` e `.razor`, com injeção adequada do script de reload em projetos Blazor.

### HTML/CSS/JS Puro

Suporte completo para projetos estáticos. A página atualiza automaticamente ao salvar qualquer arquivo.

## Troubleshooting

### Servidor não inicia

- Verifique se a porta configurada está disponível
- Tente usar uma porta diferente em `liveServerPlusPlus.port`
- Verifique se há workspace aberta no VS Code

### Página não atualiza

- Verifique se o arquivo está sendo salvo
- Confirme que o arquivo não está no `ignoreFiles`
- Recarregue a página manualmente (`F5`)

### Erro de permissão (Linux/Mac)

- Tente usar uma porta > 1024
- Verifique permissões de arquivo

### Navegador não abre automaticamente

- Desabilite `liveServerPlusPlus.openBrowser` e abra manualmente
- Ou especifique um navegador em `liveServerPlusPlus.browser`

## Recursos Avançados

### Acesso Remoto via WLAN

- Configure seu IP local em `liveServerPlusPlus.host` para acessar de outro dispositivo na mesma rede.

### HTTPS para Desenvolvimento

- Ative `liveServerPlusPlus.useHttps` para usar certificados autoassinados (útil para PWAs e APIs).

### Injetar Script em HEAD

- Altere `liveServerPlusPlus.reloadTag` para `head` se houver problemas com injeção em `body`.

## Changelog

### v1.0.4 (Atual)

- ✨ Recompilação completa com otimizações
- 🔒 Segurança aprimorada com rate limiting
- 🐛 Correções de compatibilidade
- 📦 Dependências atualizadas

### v1.0.3

- 🔒 Implementação de módulo de segurança
- 🧪 Suite de testes com 20+ casos
- 🚀 Otimizações de performance

### v1.0.0

- 🎉 Versão inicial
- 🌐 Live reload com WebSocket
- 🔧 Configurações personalizáveis

## Sobre

- Autor: Rafael Batista
- Versão: 1.0.9
- Licença: MIT
- Repositório: `https://github.com/RafaelBatistaDev/CLAW-IA---LIVE-SERVER`
- Marketplace: VS Code Marketplace
