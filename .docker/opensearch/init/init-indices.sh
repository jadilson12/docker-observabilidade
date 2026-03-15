#!/bin/sh
set -e

OPENSEARCH_URL="${OPENSEARCH_URL:-http://opensearch:9200}"

echo "[opensearch-init] Aguardando OpenSearch ficar disponível em ${OPENSEARCH_URL}..."
until curl -fsS "${OPENSEARCH_URL}" > /dev/null 2>&1; do
  sleep 2
done
echo "[opensearch-init] OpenSearch disponível."

# ---------------------------------------------------------------------------
# Função auxiliar: cria índice somente se não existir (idempotente)
# ---------------------------------------------------------------------------
create_index_if_missing() {
  INDEX_NAME="$1"
  BODY="$2"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OPENSEARCH_URL}/${INDEX_NAME}")
  if [ "$STATUS" = "200" ]; then
    echo "[opensearch-init] Índice '${INDEX_NAME}' já existe — ignorando."
  else
    echo "[opensearch-init] Criando índice '${INDEX_NAME}'..."
    curl -s -X PUT "${OPENSEARCH_URL}/${INDEX_NAME}" \
      -H "Content-Type: application/json" \
      -d "${BODY}"
    echo ""
    echo "[opensearch-init] Índice '${INDEX_NAME}' criado."
  fi
}

# ---------------------------------------------------------------------------
# Função auxiliar: cria/atualiza index template (idempotente via PUT)
# ---------------------------------------------------------------------------
create_template() {
  TEMPLATE_NAME="$1"
  BODY="$2"

  echo "[opensearch-init] Aplicando template '${TEMPLATE_NAME}'..."
  curl -s -X PUT "${OPENSEARCH_URL}/_index_template/${TEMPLATE_NAME}" \
    -H "Content-Type: application/json" \
    -d "${BODY}"
  echo ""
  echo "[opensearch-init] Template '${TEMPLATE_NAME}' aplicado."
}

# ---------------------------------------------------------------------------
# Ingest pipelines — carregados de .docker/opensearch/pipelines/*.json
# Para adicionar um novo pipeline: criar o arquivo JSON na pasta acima.
# ---------------------------------------------------------------------------
PIPELINES_DIR="/pipelines"

for PIPELINE_FILE in "${PIPELINES_DIR}"/*.json; do
  [ -f "${PIPELINE_FILE}" ] || continue
  PIPELINE_NAME=$(basename "${PIPELINE_FILE}" .json)
  echo "[opensearch-init] Aplicando ingest pipeline '${PIPELINE_NAME}'..."
  curl -s -X PUT "${OPENSEARCH_URL}/_ingest/pipeline/${PIPELINE_NAME}" \
    -H "Content-Type: application/json" \
    -d "@${PIPELINE_FILE}"
  echo ""
  echo "[opensearch-init] Pipeline '${PIPELINE_NAME}' aplicado."
done

INDICES_DIR="$(dirname "$0")/indices"

. "${INDICES_DIR}/templates.sh"
. "${INDICES_DIR}/docker-logs.sh"

echo "[opensearch-init] Inicializacao concluida."
