#!/bin/sh
set -e

OSD_URL="${OSD_URL:-http://opensearch-dashboards:5601}"

echo "[osd-init] Aguardando OpenSearch Dashboards em ${OSD_URL}..."
until curl -fsS "${OSD_URL}/api/status" > /dev/null 2>&1; do
  sleep 3
done
echo "[osd-init] OpenSearch Dashboards disponível."

# ---------------------------------------------------------------------------
# Função auxiliar: upsert de saved object
# ---------------------------------------------------------------------------
upsert() {
  TYPE="$1"
  ID="$2"
  BODY="$3"
  curl -s -X POST "${OSD_URL}/api/saved_objects/${TYPE}/${ID}?overwrite=true" \
    -H "osd-xsrf: true" \
    -H "Content-Type: application/json" \
    -d "${BODY}" > /dev/null
  echo "[osd-init] ${TYPE}/${ID} provisionado."
}

DASHBOARDS_DIR="$(dirname "$0")/dashboards"

. "${DASHBOARDS_DIR}/index-patterns.sh"
. "${DASHBOARDS_DIR}/logs.sh"
. "${DASHBOARDS_DIR}/apm.sh"
. "${DASHBOARDS_DIR}/app-exemplo.sh"
. "${DASHBOARDS_DIR}/otel-logs.sh"

echo "[osd-init] Provisionamento concluido."
