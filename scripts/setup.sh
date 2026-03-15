#!/usr/bin/env bash
# =============================================================================
# setup.sh — Configura o ambiente de desenvolvimento
#
# O que faz:
#   1. Verifica pré-requisitos (docker, node, npm)
#   2. Cria arquivos .env a partir dos exemplos (se não existirem)
#   3. Instala dependências npm (api + web)
#   4. Garante que o container postgres está rodando
#   5. Cria o banco postgres_test (se não existir)
# =============================================================================
set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

info()    { echo -e "${CYAN}[setup]${RESET} $*"; }
success() { echo -e "${GREEN}[setup] ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}[setup] ⚠${RESET} $*"; }
fail()    { echo -e "${RED}[setup] ✗${RESET} $*"; exit 1; }

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}   Configuração do Ambiente — docker-observabilidade${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

# ── 1. Pré-requisitos ───────────────────────────────────────────────────────
info "Verificando pré-requisitos..."

command -v docker >/dev/null 2>&1  || fail "docker não encontrado. Instale o Docker Desktop."
command -v node   >/dev/null 2>&1  || fail "node não encontrado. Instale o Node.js >= 20."
command -v npm    >/dev/null 2>&1  || fail "npm não encontrado."

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  fail "Node.js >= 20 é necessário (encontrado: $(node --version))."
fi

success "docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
success "node $(node --version) / npm $(npm --version)"

# ── 2. Arquivos .env ────────────────────────────────────────────────────────
info "Verificando arquivos .env..."

# Raiz
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  success "Criado $ROOT/.env a partir de .env.example"
  warn "Revise $ROOT/.env antes de subir o ambiente completo."
else
  success ".env raiz já existe"
fi

# API
if [ ! -f "$ROOT/api/.env" ]; then
  cp "$ROOT/api/.env.example" "$ROOT/api/.env"
  success "Criado api/.env a partir de .env.example"
else
  success "api/.env já existe"
fi

# ── 3. Dependências npm ─────────────────────────────────────────────────────
info "Instalando dependências npm..."

echo -e "\n  ${CYAN}→ api/${RESET}"
(cd "$ROOT/api" && npm install --prefer-offline 2>&1 | tail -3)
success "api/node_modules ok"

echo -e "\n  ${CYAN}→ web/${RESET}"
(cd "$ROOT/web" && npm install --prefer-offline 2>&1 | tail -3)
success "web/node_modules ok"

# ── 4. Docker — postgres ────────────────────────────────────────────────────
info "Verificando container postgres..."

if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon não está rodando. Inicie o Docker Desktop."
fi

POSTGRES_RUNNING=$(docker ps --filter "name=^postgres$" --filter "status=running" --format "{{.Names}}" 2>/dev/null || true)

if [ -z "$POSTGRES_RUNNING" ]; then
  warn "Container postgres não está rodando. Subindo postgres via docker compose..."
  (cd "$ROOT" && docker compose up -d postgres 2>&1 | tail -5)

  info "Aguardando postgres ficar healthy..."
  ATTEMPTS=0
  until docker exec postgres pg_isready -U postgres >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge 30 ]; then
      fail "Postgres não respondeu após 30 tentativas. Verifique os logs: docker logs postgres"
    fi
    sleep 1
  done
  success "Postgres healthy"
else
  success "Postgres já está rodando"
fi

# ── 5. Banco postgres_test ──────────────────────────────────────────────────
info "Verificando banco postgres_test..."

DB_EXISTS=$(docker exec postgres psql -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='postgres_test';" 2>/dev/null || true)

if [ "$DB_EXISTS" != "1" ]; then
  docker exec postgres psql -U postgres -c \
    "CREATE DATABASE postgres_test;" >/dev/null 2>&1
  success "Banco postgres_test criado"
else
  success "Banco postgres_test já existe"
fi

# ── Resumo ──────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}   Ambiente configurado com sucesso!${RESET}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
echo -e "  ${BOLD}Próximos passos:${RESET}"
echo -e "  • Subir ambiente completo : ${CYAN}docker compose up -d${RESET}"
echo -e "  • Rodar todos os testes   : ${CYAN}./scripts/test.sh${RESET}\n"
