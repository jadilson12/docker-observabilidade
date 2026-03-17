# ---------------------------------------------------------------------------
# Visualizações — Dashboard OTel Logs (ss4o_logs-otel-application-example-api)
# ---------------------------------------------------------------------------
upsert "visualization" "viz-otel-logs-by-service" '{
  "attributes": {
    "title": "Logs por Serviço",
    "visState": "{\"title\":\"Logs por Serviço\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":false,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"resource.service.name.keyword\",\"size\":20,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-otel-logs-by-severity" '{
  "attributes": {
    "title": "Logs por Severidade ao longo do tempo",
    "visState": "{\"title\":\"Logs por Severidade ao longo do tempo\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Logs\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"severity.text.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-otel-logs-severity-donut" '{
  "attributes": {
    "title": "Distribuição por Severidade",
    "visState": "{\"title\":\"Distribuição por Severidade\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":false,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"severity.text.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-otel-logs-errors-over-time" '{
  "attributes": {
    "title": "Erros e Warnings ao longo do tempo",
    "visState": "{\"title\":\"Erros e Warnings ao longo do tempo\",\"type\":\"line\",\"params\":{\"type\":\"line\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"interpolate\":\"linear\",\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"severity.text.keyword\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"severity.text: ERROR OR severity.text: WARN\"},\"filter\":[]}"
    }
  }
}'

# ---------------------------------------------------------------------------
# Saved Search — tabela de logs OTel
# ---------------------------------------------------------------------------
upsert "search" "search-otel-logs" '{
  "attributes": {
    "title": "OTel Logs",
    "columns": ["resource.service.name", "severity.text", "body"],
    "sort": [["@timestamp", "desc"]],
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-logs\",\"highlightAll\":true,\"version\":true,\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

# ---------------------------------------------------------------------------
# Dashboard — OTel Logs
# ---------------------------------------------------------------------------
upsert "dashboard" "dash-otel-logs" '{
  "attributes": {
    "title": "Logs — OpenTelemetry",
    "description": "Logs estruturados das aplicacoes via OpenTelemetry",
    "panelsJSON": "[{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":16,\"h\":12,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":16,\"y\":0,\"w\":16,\"h\":12,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":32,\"y\":0,\"w\":16,\"h\":12,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":12,\"w\":48,\"h\":14,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_4\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":26,\"w\":48,\"h\":20,\"i\":\"5\"},\"panelIndex\":\"5\",\"embeddableConfig\":{},\"panelRefName\":\"panel_5\"}]",
    "optionsJSON": "{\"hidePanelTitles\":false,\"useMargins\":true,\"syncColors\":false}",
    "timeRestore": true,
    "timeTo": "now",
    "timeFrom": "now-1h",
    "refreshInterval": {"pause": false, "value": 30000},
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  },
  "references": [
    {"name": "panel_1", "type": "visualization", "id": "viz-otel-logs-by-service"},
    {"name": "panel_2", "type": "visualization", "id": "viz-otel-logs-severity-donut"},
    {"name": "panel_3", "type": "visualization", "id": "viz-otel-logs-errors-over-time"},
    {"name": "panel_4", "type": "visualization", "id": "viz-otel-logs-by-severity"},
    {"name": "panel_5", "type": "search", "id": "search-otel-logs"}
  ]
}'
