# ---------------------------------------------------------------------------
# Template para índices SS4O de métricas (criados pelo OTel Collector)
# Padrão: ss4o_metrics-<dataset>-<namespace>
# ---------------------------------------------------------------------------
create_template "ss4o_metrics" '{
  "index_patterns": ["ss4o_metrics-*"],
  "priority": 1,
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.refresh_interval": "5s"
    }
  }
}'

# ---------------------------------------------------------------------------
# Template para índices SS4O de traces (criados pelo OTel Collector)
# Padrão: ss4o_traces-<dataset>-<namespace>
# ---------------------------------------------------------------------------
create_template "ss4o_traces" '{
  "index_patterns": ["ss4o_traces-*"],
  "priority": 1,
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.refresh_interval": "5s"
    }
  }
}'

# ---------------------------------------------------------------------------
# Template para índices SS4O de logs (criados pelo OTel Collector)
# Padrão: ss4o_logs-<dataset>-<namespace>
# ---------------------------------------------------------------------------
create_template "ss4o_logs" '{
  "index_patterns": ["ss4o_logs-*"],
  "priority": 1,
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.refresh_interval": "5s"
    }
  }
}'
