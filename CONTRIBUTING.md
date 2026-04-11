# Contribuindo para o CLAW IA - Live Server

Obrigado por colaborar com este projeto! Este repositório mantém o código-fonte principal da extensão VS Code e um conjunto enxuto de arquivos necessários para compilação. Sua contribuição ajuda a melhorar estabilidade, documentação e experiência de desenvolvimento.

## Como contribuir

1. Abra um issue antes de começar uma grande mudança.
2. Faça um fork do repositório.
3. Crie uma branch clara, por exemplo:
   - `feature/tema-novo`
   - `fix/erro-compilacao`
4. Faça commits pequenos e com mensagens descritivas.
5. Envie um pull request para a branch `main` com uma descrição clara do que foi alterado.

## O que agradeceríamos

- correções de bugs
- melhorias no processo de build
- documentação mais clara
- ajustes de configuração TypeScript/VS Code
- remoção de dependências desnecessárias
- melhorias no suporte a multi-root
- testes mais robustos para o servidor local

## Regras de estilo

- mantenha o estilo de código existente em `src/`
- prefira `const` e tipagem TypeScript clara
- evite adicionar arquivos gerados ao repositório
- mantenha `package.json` e `package-lock.json` consistentes

## Compilação e testes

Este projeto usa Node.js e TypeScript.

Instalação básica:

```bash
npm install
npm run compile
```

Se precisar testar localmente, abra a pasta no VS Code e use `F5` para rodar a extensão em modo de desenvolvimento.

## Boas práticas

- Use branches pequenas e focadas
- Inclua descrição completa no PR
- Verifique se não há arquivos temporários no commit
- Execute `npm run compile` antes de enviar alterações

## Contato

Se quiser ajuda para começar, abra um issue ou envie uma mensagem no GitHub.
