# CLAW IA - LIVE SERVER

[![Versão](https://img.shields.io/badge/version-1.1.4-blue)](https://github.com/RafaelBatistaDev/CLAW-IA---LIVE-SERVER/releases)
[![Desenvolvedor](https://img.shields.io/badge/developer-Rafael%20Batista-%23007ACC)](https://github.com/RafaelBatistaDev)

Uma extensão profissional para Visual Studio Code que fornece um servidor local de desenvolvimento com live reload, suporte a multi-root workspace, HTTPS automático e abertura de páginas na URL ativa do servidor.

**Tags:** `Live Server`, `Live Reload`, `Local Dev Server`, `HTTPS`, `Multi-root`, `Web Preview`, `VS Code`, `SPA`

## O que há de novo

### v1.1.4 - Universal & Container-Ready 🚀

#### ✨ Melhorias Principais

**Ativação Automática**

- Extensão carrega em qualquer workspace sem configuração prévia
- Evento de ativação universal: `"*"`
- StatusBar integrada appears imediatamente

**Detecção Dinâmica de Caminhos**

- Detecta automaticamente workspace do VS Code
- Normalização de paths em Windows/Mac/Linux
- Host normalizado: `0.0.0.0` → `127.0.0.1` automaticamente
- Suporte completo para multi-root workspaces

**Interface Integrada**

- Botão "CLAW: Offline" / "CLAW: Running" na StatusBar
- Status visual com cores indicadoras
- Tooltip com URL do servidor ativo
- Output channel dedicado com timestamps

**Build sem Dependências**

- Compilação via Podman (rootless, sem sudo)
- Script automatizado: `compile-in-container.sh`
- Dockerfile para builds reproducíveis
- Makefile com múltiplos targets
- Suporta Distrobox, Podman ou Docker

**Segurança Melhorada**

- Path traversal protection integrada
- Security headers automáticos
- Validação de porta e host
- CORS configurável (desativado por padrão)

**Logger Profissional**

- Timestamps em cada evento
- Categorias: Info (ℹ️), Warn (⚠️), Error (❌)
- Output channel no VS Code facilmente acessível
- Mensagens de erro claras e acionáveis

---

### Versões Anteriores

- `claw.openExternal` agora abre a URL ativa do Live Server
- O servidor identifica o host e porta reais em tempo de execução
- Atualizações de arquivo disparam reload automático da página
- O live reload funciona via WebSocket e injeção de script em HTML

## Principais recursos

- ✅ Início/parada do servidor a partir do Command Palette ou status bar
- ✅ Live reload automático em HTML/CSS/JS/TS ao salvar arquivos
- ✅ Suporte para múltiplas workspaces no mesmo ambiente
- ✅ SSL autoassinada para HTTPS com fallback automático
- ✅ Abrir navegador externo na URL correta do servidor ativo
- ✅ Configurações avançadas via `liveServer.settings.*`
- ✅ Menu de contexto no editor e explorador para HTML/XML
- ✨ **NOVO v1.1.4**: Ativação automática em qualquer workspace
- ✨ **NOVO v1.1.4**: Detecção dinâmica de caminhos (Windows/Mac/Linux)
- ✨ **NOVO v1.1.4**: StatusBar integrada com indicadores de status
- ✨ **NOVO v1.1.4**: Logger profissional com timestamps
- ✨ **NOVO v1.1.4**: Build via Podman/Distrobox (zero deps locais)
- ✨ **NOVO v1.1.4**: Normalização automática de hosts
- ✨ **NOVO v1.1.4**: Suporte para multi-root workspaces
- ✨ **NOVO v1.1.4**: Security headers e path traversal protection

## Instalação

### Pelo Marketplace

1. Abra o Visual Studio Code
2. Acesse Extensões (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Pesquise por `CLAW IA - LIVE SERVER`
4. Instale a extensão

### Instalação local

```bash
git clone git@github.com:RafaelBatistaDev/CLAW-IA---LIVE-SERVER.git
cd CLAW-IA---LIVE-SERVER
npm install
npm run compile
```

Abra a pasta no VS Code e pressione `F5` para executar em modo de desenvolvimento.

## Uso

### Comandos disponíveis

- `claw.toggleServer` — alterna entre iniciar e parar o servidor
- `claw.startServer` — inicia o servidor usando o arquivo aberto ou workspace atual
- `claw.stopServer` — para o servidor
- `claw.openExternal` — abre a página atual na URL ativa do Live Server
- `claw.changeWorkspace` — troca o workspace de referência em ambientes multi-root
- `claw.showSettings` — abre as configurações da extensão

### Atalhos padrão

| Ação | Windows/Linux | Mac |
| --- | --- | --- |
| Iniciar / abrir | `Alt+L Alt+O` | `Cmd+L Cmd+O` |
| Parar | `Alt+L Alt+C` | `Cmd+L Cmd+C` |

## Configuração

A extensão lê as configurações em `settings.json` usando o namespace `liveServer.settings`.

Exemplo básico:

```json
{
  "liveServer.settings.port": 5500,
  "liveServer.settings.host": "127.0.0.1",
  "liveServer.settings.noBrowser": false,
  "liveServer.settings.cors": false,
  "liveServer.settings.useLocalIp": false,
  "liveServer.settings.useWebExt": false,
  "liveServer.settings.https": {
    "enable": false,
    "cert": "",
    "key": "",
    "passphrase": ""
  }
}
```

### Portas dinâmicas e fixas

- `liveServer.settings.port`: use `0` para permitir que o sistema escolha uma porta livre automaticamente.
- Para um servidor sempre acessível em uma porta conhecida, defina um número específico entre `1024` e `65535`.
- Use `liveServer.settings.useLocalIp`: `true` para disponibilizar o servidor no IP local da máquina.

### Configurações recomendadas

- `liveServer.settings.noBrowser`: `false` para abrir automaticamente o servidor
- `liveServer.settings.useLocalIp`: `true` para acessar de outros dispositivos na rede local
- `liveServer.settings.cors`: `true` para desenvolvimento de APIs e aplicações front-end
- `liveServer.settings.file`: define um arquivo de fallback para SPAs

## Compilação

### Método 1: Local (com Node.js instalado)

```bash
npm install
npm run compile
npm run package
```

### Método 2: Container (Podman - Recomendado)

```bash
bash compile-in-container.sh podman
```

### Método 3: Makefile

```bash
make build           # Compilar tudo
make build-podman    # Build com Podman
make build-distrobox # Build com Distrobox
make clean           # Limpar arquivos
```

### Scripts disponíveis

- `npm run compile` — compila o código TypeScript
- `npm run package` — empacota a extensão em `.vsix`
- `npm run watch` — compila automaticamente durante o desenvolvimento
- `npm test` — executa a suíte de testes

## Desenvolvimento

Abra a pasta no VS Code e pressione `F5` para executar em modo de desenvolvimento.

Ver documentação completa em:

- [BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) — Guia detalhado de compilação
- [INSTALLATION-GUIDE.md](INSTALLATION-GUIDE.md) — Guia de instalação e uso

## Estrutura do projeto

- `src/` — código-fonte TypeScript
- `test/` — testes automatizados
- `package.json` — manifesto da extensão
- `README.md` — documentação do projeto

## Contribuição

Contribuições são bem-vindas. Abra issues ou pull requests no repositório para sugerir melhorias ou correções.

## Licença

Este projeto está licenciado sob a licença MIT.

## Contato

- Autor: Rafael Batista
- GitHub: <https://github.com/RafaelBatistaDev>
- Repositório: <https://github.com/RafaelBatistaDev/CLAW-IA---LIVE-SERVER>
