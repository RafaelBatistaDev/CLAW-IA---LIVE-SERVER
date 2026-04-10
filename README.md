# CLAW IA - LIVE SERVER

[![Versão](https://img.shields.io/badge/version-1.1.3-blue)](https://github.com/RafaelBatistaDev/CLAW-IA---LIVE-SERVER/releases)
[![Desenvolvedor](https://img.shields.io/badge/developer-Rafael%20Batista-%23007ACC)](https://github.com/RafaelBatistaDev)

Uma extensão profissional para Visual Studio Code que fornece um servidor local de desenvolvimento com live reload, suporte a multi-root workspace, HTTPS automático e abertura de páginas na URL ativa do servidor.

**Tags:** `Live Server`, `Live Reload`, `Local Dev Server`, `HTTPS`, `Multi-root`, `Web Preview`, `VS Code`, `SPA`

## O que há de novo

- `claw.openExternal` agora abre a URL ativa do Live Server
- O servidor identifica o host e porta reais em tempo de execução
- Atualizações de arquivo disparam reload automático da página
- O live reload funciona via WebSocket e injeção de script em HTML

## Principais recursos

- Início/parada do servidor a partir do Command Palette ou status bar
- Live reload automático em HTML/CSS/JS/TS ao salvar arquivos
- Suporte para múltiplas workspaces no mesmo ambiente
- SSL autoassinada para HTTPS com fallback automático
- Abrir navegador externo na URL correta do servidor ativo
- Configurações avançadas via `liveServer.settings.*`
- Menu de contexto no editor e explorador para HTML/XML

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

## Desenvolvimento

Use os scripts definidos em `package.json`:

- `npm run compile` — compila o código TypeScript
- `npm run package` — empacota a extensão em `.vsix`
- `npm run watch` — compila automaticamente durante o desenvolvimento
- `npm test` — executa a suíte de testes

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
