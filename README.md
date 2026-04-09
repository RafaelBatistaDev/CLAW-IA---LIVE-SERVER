# CLAW IA - LIVE SERVER

> Servidor de desenvolvimento local com live reload para VS Code. Visualize suas paginas HTML, CSS e projetos React/Vite/Blazor em tempo real com apenas um clique.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Publisher](https://img.shields.io/badge/publisher-RafaelBatista-brightgreen)
![VS Code](https://img.shields.io/badge/vscode-1.70%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Visão Geral

CLAW IA - LIVE SERVER é uma extensão poderosa e intuitiva para VS Code que oferece um servidor local de desenvolvimento com reload automático de paginas. Perfeita para desenvolvedores que trabalham com HTML, CSS, JavaScript, TypeScript, React, Vite e Blazor.

## Características Principais

✨ **Desenvolvimento Rápido**
- Servidor local otimizado para máximo desempenho
- Live reload automático ao salvar arquivos
- Suporte para paginas estáticas e dinâmicas

🎯 **Interface Intuitiva**
- Ativa/desativa com um clique na barra de status
- Menu de contexto no editor e explorador
- Paleta de comandos integrada

🔧 **Altamente Configurável**
- Porta customizavel (padrão: 5500)
- Suporte a CORS opcional
- Injeção automática de script de reload
- Múltiplos hosts (localhost, 127.0.0.1, etc)

🚀 **Suporte a Múltiplos Frameworks**
- HTML/CSS/JavaScript puro
- React e Vite
- Blazor (arquivos .cshtml)
- TypeScript/TSX

📦 **Multi-Workspace**
- Suporte completo a workspaces com múltiplas pastas
- Configuracao isolada por workspace

🌐 **HTTPS Suportado**
- Certificados auto-assinados
- Perfeito para testes SSL/TLS locais

🔒 **Segurança em Primeiro Lugar**
- Validação contra path traversal attacks
- Proteção contra XSS e script injection
- Sanitização de entrada e saída
- Headers de segurança HTTP
- Validação de host e porta
- Extensões de arquivo whitelist

## Instalacao

### Via Visual Studio Code Marketplace
1. Abra VS Code
2. Vá para Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Procure por "CLAW IA - LIVE SERVER"
4. Clique em Install

### Via Linha de Comando
```bash
code --install-extension RafaelBatista.claw-ia-live-server
```

### Desenvolvimento Local
```bash
git clone <repository-url>
cd <folder>
npm install
npm run compile
# Abra a pasta no VS Code e pressione F5 para debug
```

## Quick Start

1. **Abra um arquivo HTML** em seu projeto
2. **Pressione `Alt+L, Alt+O`** (Windows/Linux) ou **`Cmd+L, Cmd+O`** (Mac)
3. Seu navegador abrira automaticamente com o servidor rodando
4. Faça alteracoes no seu código - a pagina atualiza automaticamente!

## Como Usar

### Via Barra de Status
- Clique no item **CLAW IA - LIVE SERVER** na barra de status para iniciar/parar

### Via Paleta de Comandos
- Pressione `F1` ou `Ctrl+Shift+P`
- Digite "CLAW IA - LIVE SERVER" para ver os comandos disponiveis:
  - `Open With Live Server` - Abre arquivo atual no servidor
  - `Start Server` - Inicia o servidor
  - `Stop Server` - Para o servidor
  - `Toggle Server` - Alterna estado (ligado/desligado)
  - `Open Configuration` - Abre as opcoes de configuracao

### Via Menu de Contexto
- **No Editor**: Clique com botao direito em um arquivo HTML e selecione "CLAW IA - LIVE SERVER: Open With Live Server"
- **No Explorador**: Clique com botao direito em um arquivo HTML/HTM e selecione a opcao

## Atalhos de Teclado

| Comando | Windows/Linux | Mac |
|---------|---------------|-----|
| Iniciar/Abrir | `Alt+L, Alt+O` | `Cmd+L, Cmd+O` |
| Parar | `Alt+L, Alt+C` | `Cmd+L, Cmd+C` |

Os atalhos podem ser customizados em Keyboard Shortcuts (Ctrl+K Ctrl+S).

## Configuracoes

Acesse as configuracoes em **File > Preferences > Settings** ou pressione `Ctrl+,` e procure por "CLAW IA".

| Configuracao | Tipo | Padrao | Descricao |
|--------------|------|--------|-----------|
| `liveServerPlusPlus.port` | number | 5500 | Porta do servidor |
| `liveServerPlusPlus.host` | string | localhost | Nome do host ou IP |
| `liveServerPlusPlus.openBrowser` | boolean | true | Abre navegador automaticamente |
| `liveServerPlusPlus.browser` | string | (vazio) | Navegador opcional (ex: firefox) |
| `liveServerPlusPlus.ignoreFiles` | array | `**/node_modules/**`, `**/.git/**` | Arquivos/pastas ignorados |
| `liveServerPlusPlus.enableCORS` | boolean | false | Habilita headers CORS |
| `liveServerPlusPlus.useHttps` | boolean | false | Usa HTTPS com certificado auto-assinado |
| `liveServerPlusPlus.reloadTag` | string | body | Onde injetar script: `body` ou `head` |

### Exemplo de Configuracao
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
A extensao detecta automaticamente projetos React e Vite, servindo `index.html` como ponto de entrada. Funciona perfeitamente com create-react-app e vite.

### Blazor
Suporta arquivos `.cshtml` e `.razor`. A extensao injeta o script de reload adequadamente em projetos Blazor.

### HTML/CSS/JS Puro
Suporte completo para projetos estaticos. A pagina atualiza automaticamente ao salvar qualquer arquivo.

## Troubleshooting

### Servidor nao inicia
- Verifique se a porta configurada esta disponivel
- Tente usar uma porta diferente em `liveServerPlusPlus.port`
- Verifique se ha workspace aberta no VS Code

### Página nao atualiza
- Verifique se o arquivo esta sendo salvo
- Confirme que o arquivo nao esta no `ignoreFiles`
- Recarregue a pagina manualmente (F5)

### Erro de permissao (Linux/Mac)
- Tente usar uma porta > 1024
- Verifique permissoes de arquivo

### Navegador nao abre automaticamente
- Desabilite `liveServerPlusPlus.openBrowser` e abra manualmente
- Ou especifique um navegador em `liveServerPlusPlus.browser`

## Recursos Avancados

### Acesso Remoto via WLAN
Configure seu IP local em `liveServerPlusPlus.host` para acessar de outro dispositivo na mesma rede.

### HTTPS para Desenvolvimento
Ative `liveServerPlusPlus.useHttps` para usar certificados auto-assinados (util para PWAs e APIs).

### Injetar Script em HEAD
Altere `liveServerPlusPlus.reloadTag` para `head` se houver problemas com injecao em `body`.

## Sobre

- **Autor**: Rafael Batista
- **Versao**: 1.0.0
- **Licenca**: MIT
- **Repositorio**: [GitHub](https://github.com/seu-usuario/claw-ia-live-server)

## Suporte

Encontrou um problema? Abra uma issue no [repositorio do projeto](https://github.com/seu-usuario/claw-ia-live-server/issues).

---

**Desenvolvido com ❤️ por [Rafael Batista](https://github.com/seu-usuario)**
