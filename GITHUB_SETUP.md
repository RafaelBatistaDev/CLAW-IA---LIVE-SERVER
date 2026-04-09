# 📋 Guia Completo: Subir CLAW IA - LIVE SERVER para GitHub

## ✅ Estrutura Pronta!

Seu projeto foi limpo e preparado com **apenas arquivos essenciais**:

```
📦 claw-ia-live-server/
├── 📁 src/
│   ├── extension.ts          ← Ponto de entrada
│   ├── security.ts           ← Validações de segurança
│   └── server.ts             ← Servidor HTTP/WebSocket
├── 📁 test/
│   └── security.test.ts      ← Testes de segurança
├── 📁 .vscode/
│   ├── launch.json           ← Debug config
│   ├── settings.json         ← Editor settings
│   └── tasks.json            ← Build tasks
├── 📁 .github/
│   ├── README.md             ← Docs para GitHub
│   └── copilot-instructions.md
├── 📄 package.json           ← Dependências (v1.1.0)
├── 📄 tsconfig.json          ← TypeScript config
├── 📄 .vscodeignore          ← Files to ignore in package
├── 📄 .gitignore             ← Git ignore rules
├── 📄 README.md              ← Documentação principal
├── 📄 CONTRIBUTING.md        ← Guia de contribuição
├── 📄 SECURITY.md            ← Política de segurança
├── 📄 CHANGELOG.md           ← Histórico de versões
├── 📄 LICENSE                ← MIT License
└── 📄 SETUP_GIT.sh           ← Script de inicialização
```

## 🚀 Passo a Passo para GitHub

### Fase 1: Inicializar Repositório Local

```bash
cd ./CLAW-IA---LIVE-SERVER
bash SETUP_GIT.sh
```

O script irá:
1. ✅ Inicializar `.git`
2. ✅ Solicitar suas credenciais GitHub
3. ✅ Criar primeiro commit
4. ✅ Exibir próximos passos

### Fase 2: Criar Repositório no GitHub

1. ✅ Repositório já criado: `CLAW-IA---LIVE-SERVER`
2. Preencha os campos:
   - **Repository name**: `CLAW-IA---LIVE-SERVER`
   - **Description**: `VS Code extension for live reload server`
   - **Public** (importante para publicar no Marketplace)
3. Clique em "Create repository"
4. **Não adicione** README, .gitignore ou LICENSE (já temos localmente)

### Fase 3: Conectar ao GitHub

Após criar o repositório, GitHub vai mostrar:

```bash
git remote add origin git@github.com:RafaelBatistaDev/CLAW-IA---LIVE-SERVER.git
git push -u origin main
```

Execute esses comandos na pasta do projeto.

## 📝 Verificação

Confirme que está tudo pronto:

```bash
# 1. Verificar Git
git status
git log --oneline

# 2. Verificar package.json
cat package.json | grep version

# 3. Listar arquivos
ls -la
```

Esperado:
- ✅ Git inicializado
- ✅ 1+ commits
- ✅ version: 1.1.0
- ✅ 18 arquivos/pastas listados

## 🔗 Próximas Etapas

### Se tudo está no GitHub:

1. **Compilar localmente:**
```bash
npm install
npm run compile
```

2. **Testar a extensão:**
   - Pressione `F5` em VS Code
   - Uma nova janela abrirá com a extensão loaded

3. **Publicar no Marketplace (Opcional):**
```bash
npm install -g vsce
vsce publish -p SEU_TOKEN
```

Para gerar token: https://dev.azure.com → Personal access tokens

## 📚 Documentação Incluída

| Arquivo | Propósito |
|---------|-----------|
| `README.md` | 📖 Guia de uso da extensão |
| `CONTRIBUTING.md` | 👥 Como contribuir |
| `SECURITY.md` | 🔒 Política de segurança |
| `CHANGELOG.md` | 📋 Histórico de versões |
| `LICENSE` | ⚖️ MIT License |
| `.github/README.md` | 🔧 Docs internas de desenvolvimento |

## ⚙️ Troubleshooting

### Erro: "fatal: not a git repository"
```bash
bash SETUP_GIT.sh
```

### Erro ao fazer push: "remote already exists"
```bash
git remote rm origin
git remote add origin https://github.com/SEU_USUARIO/claw-ia-live-server.git
```

### Duvida sobre formatação de commit?
Use: `git commit -m "Brief description of changes"`

## ✨ Características v1.0.0 no GitHub

- ✅ Live reload automático
- ✅ Suporte multi-framework (React, Vite, Blazor)
- ✅ **NOVO: Segurança hardened (path traversal, XSS protection)**
- ✅ Testes de segurança (20+ casos)
- ✅ Configurável via VS Code settings
- ✅ Atalhos de teclado personalizáveis

## 🎯 Checklist Final

Antes de considerar "pronto para GitHub":

- [ ] Executei `bash SETUP_GIT.sh`
- [ ] Criei repositório em github.com/new
- [ ] Executei `git remote add origin ...`
- [ ] Executei `git push -u origin main`
- [ ] Verifiquei no GitHub (repositório aparece online)
- [ ] Compilei localmente: `npm install && npm run compile`
- [ ] Testei em VS Code: `F5`

Pronto! 🎉

## 📞 Suporte

Dúvidas? Consulte:
- `.github/README.md` - Documentação técnica
- `CONTRIBUTING.md` - Guia de desenvolvimento
- `SECURITY.md` - Política de segurança
