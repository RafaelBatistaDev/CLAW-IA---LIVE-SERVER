# CLAW IA - LIVE SERVER

Uma extensão para Visual Studio Code que fornece um servidor local de desenvolvimento com live reload e configurações avançadas para HTML, CSS, JavaScript, TypeScript e frameworks modernos.

## Recursos

- Servidor local com reload automático ao salvar
- Comandos dedicados no Command Palette
- Atalhos de teclado configuráveis
- Suporte a multi-root workspace
- HTTPS com certificado autoassinando
- CORS opcional
- Configuração completa via `settings.json`
- Menu de contexto no editor e explorador

## Instalação

### Marketplace

1. Abra o Visual Studio Code
2. Acesse a aba Extensões (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Busque por `CLAW IA - LIVE SERVER`
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

- `claw.toggleServer` — alterna o servidor
- `claw.startServer` — inicia o servidor
- `claw.stopServer` — para o servidor
- `claw.openExternal` — abre no navegador externo
- `claw.changeWorkspace` — altera workspace
- `claw.showSettings` — abre as configurações

### Atalhos padrão

| Ação | Windows/Linux | Mac |
| --- | --- | --- |
| Iniciar / abrir | `Alt+L Alt+O` | `Cmd+L Cmd+O` |
| Parar | `Alt+L Alt+C` | `Cmd+L Cmd+C` |

## Configuração

A extensão usa `liveServer.settings.*` no arquivo de configurações do VS Code.

Exemplo:

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

## Desenvolvimento

Use os scripts disponíveis em `package.json`:

- `npm run compile` — compila TypeScript
- `npm run package` — empacota extensão em `.vsix`
- `npm run watch` — compila em modo watch
- `npm test` — executa testes

## Estrutura do Projeto

- `src/` — código-fonte TypeScript
- `out/` — saída de compilação (não versionada)
- `test/` — testes automatizados
- `package.json` — manifesto da extensão
- `README.md` — documentação do projeto

## Contribuição

Contribuições são bem-vindas! Abra issues e pull requests no repositório.

## Licença

Licenciado sob MIT.

## Contato

- Autor: Rafael Batista
- GitHub: https://github.com/RafaelBatistaDev
- Repositório: https://github.com/RafaelBatistaDev/CLAW-IA---LIVE-SERVER
