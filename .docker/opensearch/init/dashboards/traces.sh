# ---------------------------------------------------------------------------
# Visualizações — Dashboard Traces — OpenTelemetry
# ---------------------------------------------------------------------------

upsert "visualization" "viz-traces-total-spans" '{
  "attributes": {
    "title": "Total de Spans",
    "visState": "{\"title\":\"Total de Spans\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Blues\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":99999999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"spans\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-server-spans" '{
  "attributes": {
    "title": "Spans de Entrada (Server)",
    "visState": "{\"title\":\"Spans de Entrada (Server)\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Greens\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":99999999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"server spans\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Server\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-latency-avg-kpi" '{
  "attributes": {
    "title": "Latência Média (ms)",
    "visState": "{\"title\":\"Latência Média (ms)\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":200},{\"from\":200,\"to\":1000},{\"from\":1000,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":true,\"subText\":\"ms\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"Avg Latência\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-kind-donut" '{
  "attributes": {
    "title": "Spans por Tipo (Kind)",
    "visState": "{\"title\":\"Spans por Tipo (Kind)\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":false,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"kind.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-by-service-time" '{
  "attributes": {
    "title": "Spans por Serviço ao longo do tempo",
    "visState": "{\"title\":\"Spans por Serviço ao longo do tempo\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Spans\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"startTime\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"resource.service.name.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-latency-by-service-time" '{
  "attributes": {
    "title": "Latência Média por Serviço ao longo do tempo (ms)",
    "visState": "{\"title\":\"Latência Média por Serviço ao longo do tempo (ms)\",\"type\":\"line\",\"params\":{\"type\":\"line\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"ms\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"Média (ms)\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"interpolate\":\"linear\",\"showCircles\":false}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"Média (ms)\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"startTime\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"resource.service.name.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-top-operations" '{
  "attributes": {
    "title": "Operações mais chamadas — Volume e Latência",
    "visState": "{\"title\":\"Operações mais chamadas — Volume e Latência\",\"type\":\"table\",\"params\":{\"perPage\":15,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"showTotal\":false,\"totalFunc\":\"sum\",\"percentageCol\":\"\"},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Spans\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"Média (ms)\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"percents\":[95],\"customLabel\":\"P95 (ms)\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"name.keyword\",\"size\":20,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Operação\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-traces-service-donut" '{
  "attributes": {
    "title": "Spans por Serviço",
    "visState": "{\"title\":\"Spans por Serviço\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":false,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"resource.service.name.keyword\",\"size\":20,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

# ---------------------------------------------------------------------------
# Dashboard — Traces — OpenTelemetry
# ---------------------------------------------------------------------------
upsert "dashboard" "dash-traces" '{
  "attributes": {
    "title": "Traces — OpenTelemetry",
    "description": "Spans, latência e operações distribuídas via OpenTelemetry",
    "panelsJSON": "[{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":12,\"h\":8,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":12,\"y\":0,\"w\":12,\"h\":8,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":12,\"h\":8,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":36,\"y\":0,\"w\":12,\"h\":8,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_4\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":8,\"w\":24,\"h\":14,\"i\":\"5\"},\"panelIndex\":\"5\",\"embeddableConfig\":{},\"panelRefName\":\"panel_5\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":8,\"w\":24,\"h\":14,\"i\":\"6\"},\"panelIndex\":\"6\",\"embeddableConfig\":{},\"panelRefName\":\"panel_6\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":22,\"w\":48,\"h\":14,\"i\":\"7\"},\"panelIndex\":\"7\",\"embeddableConfig\":{},\"panelRefName\":\"panel_7\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":36,\"w\":48,\"h\":16,\"i\":\"8\"},\"panelIndex\":\"8\",\"embeddableConfig\":{},\"panelRefName\":\"panel_8\"}]",
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
    {"name": "panel_1", "type": "visualization", "id": "viz-traces-total-spans"},
    {"name": "panel_2", "type": "visualization", "id": "viz-traces-server-spans"},
    {"name": "panel_3", "type": "visualization", "id": "viz-traces-latency-avg-kpi"},
    {"name": "panel_4", "type": "visualization", "id": "viz-traces-kind-donut"},
    {"name": "panel_5", "type": "visualization", "id": "viz-traces-by-service-time"},
    {"name": "panel_6", "type": "visualization", "id": "viz-traces-latency-by-service-time"},
    {"name": "panel_7", "type": "visualization", "id": "viz-traces-service-donut"},
    {"name": "panel_8", "type": "visualization", "id": "viz-traces-top-operations"}
  ]
}'
