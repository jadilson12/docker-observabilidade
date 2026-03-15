#!/usr/bin/env bash
# =============================================================================
# test.sh — Roda todos os testes da API e do Web
#
# Suites da API (executadas em ordem):
#   unit        → testes unitários (vitest.config.ts)
#   integration → testes de integração com banco mockado
#   e2e         → end-to-end com banco real (postgres_test)
#   stress      → carga concorrente com banco real
#
# Suites do Web:
#   unit        → componentes e actions (vitest + jsdom)
#
# Uso:
#   ./scripts/test.sh              # roda tudo
#   ./scripts/test.sh api          # roda só a API (todas as suites)
#   ./scripts/test.sh web          # roda só o Web
#   ./scripts/test.sh api:unit     # roda só unit da API
#   ./scripts/test.sh api:stress   # roda só stress da API
# =============================================================================
set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILTER="${1:-all}"

# Contadores globais
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
declare -a FAILURES=()

# ── Helpers ─────────────────────────────────────────────────────────────────
header() {
  echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}   $*${RESET}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
}

section() {
  echo -e "\n${CYAN}${BOLD}▶ $*${RESET}"
}

run_suite() {
  local label="$1"
  local dir="$2"
  shift 2
  local cmd=("$@")

  TOTAL_SUITES=$((TOTAL_SUITES + 1))

  echo -e "\n${DIM}┌─ ${label}${RESET}"

  local start_ts
  start_ts=$(date +%s)

  local output
  local exit_code=0
  output=$(cd "$dir" && "${cmd[@]}" 2>&1) || exit_code=$?

  local end_ts
  end_ts=$(date +%s)
  local elapsed=$(( end_ts - start_ts ))

  # Extrai sumário do vitest (última linha com "Tests" ou "Test Files")
  local summary
  summary=$(echo "$output" | grep -E "Test Files|Tests " | tail -1 | sed 's/\x1b\[[0-9;]*m//g' | xargs)

  if [ $exit_code -eq 0 ]; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
    echo -e "${DIM}└─${RESET} ${GREEN}✓ PASSOU${RESET}  ${DIM}${elapsed}s — ${summary}${RESET}"
  else
    FAILED_SUITES=$((FAILED_SUITES + 1))
    FAILURES+=("$label")
    echo -e "${DIM}└─${RESET} ${RED}✗ FALHOU${RESET}  ${DIM}${elapsed}s — ${summary}${RESET}"

    # Mostra as últimas linhas relevantes do output em caso de falha
    echo -e "\n${DIM}  Detalhes:${RESET}"
    echo "$output" \
      | grep -v "^\[Nest\].*LOG\|^\[Nest\].*WARN\|^\[Nest\].*Debug" \
      | sed 's/\x1b\[[0-9;]*m//g' \
      | grep -E "FAIL|×|AssertionError|Error:|failed" \
      | head -15 \
      | sed 's/^/  /'
    echo ""
  fi
}

# ── Verificações iniciais ────────────────────────────────────────────────────
header "Testes — docker-observabilidade"

# Verifica postgres para suites que precisam de banco
needs_postgres() {
  [[ "$FILTER" == "all" || "$FILTER" == "api" || \
     "$FILTER" == "api:e2e" || "$FILTER" == "api:stress" || \
     "$FILTER" == "api:integration" ]]
}

if needs_postgres; then
  if ! docker exec postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠  Postgres não está acessível. Execute primeiro:${RESET}"
    echo -e "   ${CYAN}./scripts/setup.sh${RESET}\n"
    exit 1
  fi

  # Garante que postgres_test existe
  DB_EXISTS=$(docker exec postgres psql -U postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='postgres_test';" 2>/dev/null || true)
  if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${YELLOW}⚠  Banco postgres_test não existe. Criando...${RESET}"
    docker exec postgres psql -U postgres -c \
      "CREATE DATABASE postgres_test;" >/dev/null 2>&1
  fi
fi

# ── API ─────────────────────────────────────────────────────────────────────
run_api() {
  section "API"

  if [[ "$FILTER" == "all" || "$FILTER" == "api" || "$FILTER" == "api:unit" ]]; then
    run_suite \
      "API · Unitários" \
      "$ROOT/api" \
      npm test
  fi

  if [[ "$FILTER" == "all" || "$FILTER" == "api" || "$FILTER" == "api:integration" ]]; then
    run_suite \
      "API · Integração" \
      "$ROOT/api" \
      npm run test:integration
  fi

  if [[ "$FILTER" == "all" || "$FILTER" == "api" || "$FILTER" == "api:e2e" ]]; then
    run_suite \
      "API · E2E" \
      "$ROOT/api" \
      npm run test:e2e
  fi

  if [[ "$FILTER" == "all" || "$FILTER" == "api" || "$FILTER" == "api:stress" ]]; then
    run_suite \
      "API · Stress" \
      "$ROOT/api" \
      npm run test:stress
  fi
}

# ── Web ─────────────────────────────────────────────────────────────────────
run_web() {
  section "Web"

  if [[ "$FILTER" == "all" || "$FILTER" == "web" ]]; then
    run_suite \
      "Web · Unitários" \
      "$ROOT/web" \
      npm test
  fi
}

# ── Execução ─────────────────────────────────────────────────────────────────
case "$FILTER" in
  all)
    run_api
    run_web
    ;;
  api | api:unit | api:integration | api:e2e | api:stress)
    run_api
    ;;
  web)
    run_web
    ;;
  *)
    echo -e "${RED}Filtro inválido: '$FILTER'${RESET}"
    echo -e "Uso: $0 [all|api|web|api:unit|api:integration|api:e2e|api:stress]"
    exit 1
    ;;
esac

# ── Resumo final ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}   Resultado Final${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

echo -e "  Suites executadas : ${BOLD}${TOTAL_SUITES}${RESET}"
echo -e "  ${GREEN}Passaram          : ${BOLD}${PASSED_SUITES}${RESET}"

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo -e "  ${RED}Falharam          : ${BOLD}${FAILED_SUITES}${RESET}"
  echo -e "\n  ${RED}${BOLD}Suites com falha:${RESET}"
  for f in "${FAILURES[@]}"; do
    echo -e "    ${RED}✗${RESET} $f"
  done
  echo ""
  exit 1
else
  echo -e "\n  ${GREEN}${BOLD}Todos os testes passaram! ✓${RESET}\n"
fi
