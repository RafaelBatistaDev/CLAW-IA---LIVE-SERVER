# CLAW IA - LIVE SERVER (Resumo)

Uma extensão leve para Visual Studio Code que oferece um servidor local de desenvolvimento com live reload, HTTPS automático e abertura de páginas na URL ativa do servidor.

## Principais recursos

- Servidor local para desenvolvimento de HTML, CSS, JS, TS e SPAs
- Live reload automático ao salvar arquivos
- Suporte a multi-root workspace
- HTTPS com certificado autoassinado quando habilitado
- `claw.openExternal` abre a URL ativa do servidor em execução
- Configurações avançadas via `liveServer.settings.*`
- `liveServer.settings.port`: use `0` para porta aleatória ou defina um número fixo para porta conhecida
- Comandos diretos no Command Palette e menu de contexto

## Comandos principais

- `claw.startServer` — inicia o servidor
- `claw.stopServer` — para o servidor
- `claw.toggleServer` — alterna entre iniciar e parar
- `claw.openExternal` — abre a página atual no navegador externo

## Instalação local

```bash
git clone git@github.com:RafaelBatistaDev/CLAW-IA---LIVE-SERVER.git
cd CLAW-IA---LIVE-SERVER
npm install
npm run compile
```

Abra a extensão no VS Code e pressione `F5` para executar em modo de desenvolvimento.

## Por que usar

O CLAW IA - LIVE SERVER foi projetado para desenvolvedores que precisam de uma experiência rápida de pré-visualização, com atualização automática de páginas e suporte a configuração flexível. Ideal para projetos estáticos e aplicações front-end modernas.
