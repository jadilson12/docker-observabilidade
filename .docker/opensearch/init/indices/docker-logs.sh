# ---------------------------------------------------------------------------
# Índice docker-logs (criado pelo Fluent Bit)
# ---------------------------------------------------------------------------
create_index_if_missing "docker-logs" '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "index.refresh_interval": "5s"
  },
  "mappings": {
    "properties": {
      "@timestamp":      { "type": "date" },
      "log":             { "type": "text" },
      "log_source":      { "type": "keyword" },
      "container_id":    { "type": "keyword" },
      "container_name":  { "type": "keyword" },
      "source":          { "type": "keyword" }
    }
  }
}'
