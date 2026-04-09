#!/bin/bash

# Script para inicializar repositório Git e preparar para GitHub
# Uso: bash SETUP_GIT.sh

set -e

# Detectar diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Inicializando repositório Git para CLAW IA - LIVE SERVER..."
echo ""

# Verificar se git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Git não está instalado. Por favor, instale git primeiro."
    exit 1
fi

# Remover direitório .git anterior se existir
if [ -d ".git" ]; then
    echo "⚠️  Removendo repositório Git anterior..."
    rm -rf .git
fi

# Inicializar repositório
echo "📝 Criando novo repositório Git..."
git init

# Configurar git (opcional - solicitar do usuário)
echo ""
echo "Configurando Git..."
read -p "Digite seu nome de usuário GitHub (ex: seu-usuario): " GITHUB_USER
read -p "Digite seu email: " USER_EMAIL

git config user.name "$GITHUB_USER"
git config user.email "$USER_EMAIL"

# Adicionar todos os arquivos
echo ""
echo "📦 Adicionando arquivos ao índice..."
git add -A

# Criar primeiro commit
echo ""
echo "💾 Criando primeiro commit..."
git commit -m "Initial commit: CLAW IA - LIVE SERVER v1.1.0 with security hardening"

# Criar branch main se não existir
git branch -M main

echo ""
echo "✅ Repositório Git inicializado com sucesso!"
echo ""
echo "📋 Próximas etapas:"
echo ""
echo "1. Criar repositório no GitHub:"
echo "   https://github.com/new"
echo "   Nome: claw-ia-live-server"
echo "   Descrição: VS Code extension for live reload server"
echo ""
echo "2. Depois, execute:"
echo "   git remote add origin https://github.com/$GITHUB_USER/claw-ia-live-server.git"
echo "   git push -u origin main"
echo ""
echo "3. Para fazer push em futuras mudanças:"
echo "   git add ."
echo "   git commit -m 'Sua mensagem de commit'"
echo "   git push"
echo ""
echo "📚 Status do repositório:"
git status
