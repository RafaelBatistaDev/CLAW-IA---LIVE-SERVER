# Contribuindo para CLAW IA - LIVE SERVER

Obrigado por sua interesse em contribuir! Este projeto é desenvolvido de forma colaborativa.

## Como Contribuir

### Reportar Bugs
1. Vá para [Issues](https://github.com/RafaelBatistaDev/CLAW-IA---LIVE-SERVER/issues)
2. Clique em "New Issue"
3. Descreva o problema com clareza, incluindo:
   - Versão do VS Code
   - Versão da extensão
   - Sistema operacional
   - Passos para reproduzir
   - Comportamento esperado vs observado

### Sugerir Melhorias
1. Abra uma nova issue com label `enhancement`
2. Descreva a funcionalidade desejada
3. Explique por que seria útil

### Submeter Pull Requests
1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/sua-feature`)
3. Commit suas mudanças (`git commit -am 'Add nova feature'`)
4. Push para a branch (`git push origin feature/sua-feature`)
5. Abra um Pull Request

## Diretrizes de Desenvolvimento

- Mantenha o código limpo e legível
- Adicione testes para novas funcionalidades
- Atualize documentação conforme necessário
- Siga as convenções de código existentes
- Certifique-se que tudo compila sem erros

## Setup Local

```bash
# Clone o repositório
git clone git@github.com:RafaelBatistaDev/CLAW-IA---LIVE-SERVER.git
cd CLAW-IA---LIVE-SERVER

# Instale dependências
npm install

# Compile TypeScript
npm run compile

# Execute testes
npm test

# Build da extensão
npm run build
```

## Estrutura do Projeto

```
├── src/
│   ├── extension.ts      # Ponto de entrada
│   ├── server.ts         # Servidor HTTP/WebSocket
│   └── security.ts       # Validações de segurança
├── test/
│   └── security.test.ts  # Testes
├── package.json
├── tsconfig.json
└── README.md
```

## Código de Conduta

Este projeto adere a um Código de Conduta inclusivo. Esperamos que todos os contribuidores se comportem profissionalmente e respeitosamente.

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a MIT License.
