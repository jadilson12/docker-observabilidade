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

# ---------------------------------------------------------------------------
# Função auxiliar: adicionar scripted field a um index pattern existente
# ---------------------------------------------------------------------------
add_scripted_field() {
  PATTERN_ID="$1"
  FIELD_NAME="$2"
  FIELD_TYPE="$3"
  FIELD_SCRIPT="$4"
  python3 - <<EOF
import sys, json, urllib.request, urllib.error

url_base = "${OSD_URL}"
pattern_id = "${PATTERN_ID}"
field_name = "${FIELD_NAME}"

# Buscar index pattern atual
req = urllib.request.Request(
  f"{url_base}/api/saved_objects/index-pattern/{pattern_id}",
  headers={"osd-xsrf": "true"}
)
with urllib.request.urlopen(req) as r:
  data = json.loads(r.read())

fields = json.loads(data["attributes"]["fields"])

# Remover campo existente com mesmo nome (idempotente)
fields = [f for f in fields if f.get("name") != field_name]

# Adicionar scripted field
fields.append({
  "count": 0,
  "name": field_name,
  "type": "${FIELD_TYPE}",
  "scripted": True,
  "script": "${FIELD_SCRIPT}",
  "lang": "painless",
  "searchable": True,
  "aggregatable": True,
  "readFromDocValues": False
})

# Atualizar index pattern
payload = json.dumps({
  "attributes": {
    "title": data["attributes"]["title"],
    "timeFieldName": data["attributes"]["timeFieldName"],
    "fields": json.dumps(fields)
  }
}).encode()

req = urllib.request.Request(
  f"{url_base}/api/saved_objects/index-pattern/{pattern_id}",
  data=payload,
  headers={"osd-xsrf": "true", "Content-Type": "application/json"},
  method="PUT"
)
with urllib.request.urlopen(req) as r:
  pass

print(f"[osd-init] scripted field '{field_name}' adicionado ao index-pattern/{pattern_id}.")
EOF
}

DASHBOARDS_DIR="$(dirname "$0")/dashboards"

. "${DASHBOARDS_DIR}/index-patterns.sh"
. "${DASHBOARDS_DIR}/logs.sh"
. "${DASHBOARDS_DIR}/apm.sh"
. "${DASHBOARDS_DIR}/app-exemplo.sh"
. "${DASHBOARDS_DIR}/otel-logs.sh"
. "${DASHBOARDS_DIR}/traces.sh"
. "${DASHBOARDS_DIR}/scripted-fields.sh"

echo "[osd-init] Provisionamento concluido."
