# ---------------------------------------------------------------------------
# Visualizações — Dashboard de Logs (Docker/Fluent Bit + OTel)
# ---------------------------------------------------------------------------

# --- Fluent Bit / Docker Logs ---

upsert "visualization" "viz-logs-donut" '{
  "attributes": {
    "title": "Logs por Container",
    "visState": "{\"title\":\"Logs por Container\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":false,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"container_name\",\"size\":20,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"missingBucket\":false}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-docker-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-logs-histogram" '{
  "attributes": {
    "title": "Volume de Logs por Container ao longo do tempo",
    "visState": "{\"title\":\"Volume de Logs por Container ao longo do tempo\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Logs\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"container_name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"missingBucket\":false}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-docker-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-logs-stderr" '{
  "attributes": {
    "title": "Logs stderr por Container",
    "visState": "{\"title\":\"Logs stderr por Container\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Logs\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"container_name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-docker-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"source: stderr\"},\"filter\":[]}"
    }
  }
}'

# --- Saved Searches ---

upsert "search" "search-docker-logs" '{
  "attributes": {
    "title": "Docker Logs (Fluent Bit)",
    "columns": ["container_name", "source", "log"],
    "sort": [["@timestamp", "desc"]],
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-docker-logs\",\"highlightAll\":true,\"version\":true,\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "search" "search-docker-logs-api" '{
  "attributes": {
    "title": "Docker Logs — API",
    "columns": ["container_name", "source", "log"],
    "sort": [["@timestamp", "desc"]],
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-docker-logs\",\"highlightAll\":true,\"version\":true,\"query\":{\"language\":\"kuery\",\"query\":\"container_name: \\\"/application-api\\\"\"},\"filter\":[]}"
    }
  }
}'

# ---------------------------------------------------------------------------
# Dashboard — Logs (unificado)
# ---------------------------------------------------------------------------
upsert "dashboard" "dash-logs" '{
  "attributes": {
    "title": "Logs — OTel & Fluent Bit",
    "description": "Logs estruturados das aplicacoes (OpenTelemetry) e logs brutos dos containers (Fluent Bit)",
    "panelsJSON": "[{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":16,\"h\":12,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":16,\"y\":0,\"w\":32,\"h\":12,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":12,\"w\":48,\"h\":12,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":24,\"w\":48,\"h\":18,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_4\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":42,\"w\":48,\"h\":18,\"i\":\"5\"},\"panelIndex\":\"5\",\"embeddableConfig\":{},\"panelRefName\":\"panel_5\"}]",
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
    {"name": "panel_1", "type": "visualization", "id": "viz-logs-donut"},
    {"name": "panel_2", "type": "visualization", "id": "viz-logs-histogram"},
    {"name": "panel_3", "type": "visualization", "id": "viz-logs-stderr"},
    {"name": "panel_4", "type": "search", "id": "search-docker-logs-api"},
    {"name": "panel_5", "type": "search", "id": "search-docker-logs"}
  ]
}'
