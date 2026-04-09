# CLAW IA - LIVE SERVER no GitHub

Este arquivo contém informações sobre o repositório GitHub para desenvolvedores.

## Primeiros Passos

### 1. Inicializar Repositório Local

```bash
cd ./CLAW-IA---LIVE-SERVER
bash SETUP_GIT.sh
```

O script irá:
- Inicializar um novo repositório Git
- Configurar seu nome e email do GitHub
- Criar o primeiro commit
- Exibir instruções para criar o repositório no GitHub

### 2. Criar Repositório no GitHub

1. Vá para [github.com/new](https://github.com/new)
2. Nome: `claw-ia-live-server`
3. Descrição: `VS Code extension for live reload server`
4. Escolha: Public (para ser publicado no Marketplace)
5. Clique em "Create repository"

### 3. Conectar ao GitHub

Siga as instruções exibidas após executar `SETUP_GIT.sh`:

```bash
git remote add origin https://github.com/SEU_USUARIO/claw-ia-live-server.git
git push -u origin main
```

## Publicar no VS Code Marketplace

### Pré-requisitos
```bash
npm install -g vsce
```

### Compilar Extension
```bash
npm install
npm run compile
```

### Publicar
```bash
vsce publish -p SEU_TOKEN_PERSONAL_ACCESS_TOKEN
```

Para gerar o token em [dev.azure.com](https://dev.azure.com):
1. Vá para seu perfil
2. Personal access tokens
3. New Token
4. Escopo: Marketplace > Publish
5. Copie o token

## Estrutura de Desenvolvimento

```
src/
  - extension.ts       # Ponto de entrada da extensão
  - server.ts          # Servidor HTTP/WebSocket
  - security.ts        # Validações de segurança
test/
  - security.test.ts   # Testes de segurança
package.json           # Configuração da extensão
tsconfig.json          # Configuração TypeScript
```

## Tarefas Comuns

### Compilar
```bash
npm run compile
```

### Executar Testes
```bash
npm test
```

### Fazer Watch (desenvolvimento)
```bash
npm run watch
```

### Debugar (VS Code)
1. Pressione `F5` ou vá para Debug (Ctrl+Shift+D)
2. Selecione "Run Extension"

## Próxima Fase: AI Detection

Após publicar v1.1.0, a próxima fase (FASE 2) será:
- Integração de detecção automática de IA
- Suporte a GitHub Copilot, Codeium, Tabnine
- Novos comandos e UI melhorada

Veja [AI_DETECTION_EXTENSION.md](../AI_DETECTION_EXTENSION.md) para detalhes do planejamento.

## Contatos

- **Autor**: Rafael Batista
- **Email**: rafaelbatistadev@outlook.com.br
- **GitHub**: https://github.com/RafaelBatistaDev

## Licença

MIT License - veja [LICENSE](../LICENSE) para detalhes.
