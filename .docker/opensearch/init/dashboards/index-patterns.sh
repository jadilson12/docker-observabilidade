# ---------------------------------------------------------------------------
# Index Patterns
# ---------------------------------------------------------------------------
upsert "index-pattern" "ip-logs" '{
  "attributes": {
    "title": "ss4o_logs-otel-demo",
    "timeFieldName": "@timestamp"
  }
}'

upsert "index-pattern" "ip-docker-logs" '{
  "attributes": {
    "title": "docker-logs",
    "timeFieldName": "@timestamp"
  }
}'

upsert "index-pattern" "ip-traces" '{
  "attributes": {
    "title": "ss4o_traces-otel-aplicacao-example",
    "timeFieldName": "@timestamp"
  }
}'

upsert "index-pattern" "ip-metrics" '{
  "attributes": {
    "title": "ss4o_metrics-otel-demo",
    "timeFieldName": "@timestamp"
  }
}'

upsert "index-pattern" "ip-apm-spans" '{
  "attributes": {
    "title": "otel-v1-apm-span*",
    "timeFieldName": "startTime"
  }
}'

upsert "index-pattern" "ip-apm-service-map" '{
  "attributes": {
    "title": "otel-v1-apm-service-map",
    "timeFieldName": "@timestamp"
  }
}'
