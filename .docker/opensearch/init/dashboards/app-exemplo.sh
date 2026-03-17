# ---------------------------------------------------------------------------
# Visualizações — Dashboard App Exemplo
# ---------------------------------------------------------------------------
upsert "visualization" "viz-app-latency-avg" '{
  "attributes": {
    "title": "Latência Média Atual (ms)",
    "visState": "{\"title\":\"Latência Média Atual (ms)\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":100},{\"from\":100,\"to\":500},{\"from\":500,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":true,\"subText\":\"ms\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"Avg Latência\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-latency-p95-kpi" '{
  "attributes": {
    "title": "P95 Latência Atual (ms)",
    "visState": "{\"title\":\"P95 Latência Atual (ms)\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":100},{\"from\":100,\"to\":500},{\"from\":500,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":true,\"subText\":\"ms\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"percents\":[95],\"customLabel\":\"P95\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-total-requests" '{
  "attributes": {
    "title": "Total de Requisições",
    "visState": "{\"title\":\"Total de Requisições\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Blues\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"requisições\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Requisições\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-total-errors" '{
  "attributes": {
    "title": "Total Erros HTTP (4xx/5xx)",
    "visState": "{\"title\":\"Total Erros HTTP (4xx/5xx)\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"erros\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Erros\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code >= 400\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-users-created" '{
  "attributes": {
    "title": "Usuários Criados",
    "visState": "{\"title\":\"Usuários Criados\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Blues\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"criados\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Criados\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"name.keyword: \\\"POST /users\\\" AND attributes.http.status_code: 201\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-users-viewed" '{
  "attributes": {
    "title": "Usuários Visualizados",
    "visState": "{\"title\":\"Usuários Visualizados\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Greens\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":99999}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"visualizados\",\"fontSize\":40}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Visualizados\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"name.keyword: \\\"GET /users/:id\\\"\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-latency-percentiles-time" '{
  "attributes": {
    "title": "P50 / P95 / P99 — Latência por tempo (ms)",
    "visState": "{\"title\":\"P50 / P95 / P99 — Latência por tempo (ms)\",\"type\":\"line\",\"params\":{\"type\":\"line\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"ms\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"P50\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"interpolate\":\"linear\",\"showCircles\":false},{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"P95\",\"id\":\"2\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"interpolate\":\"linear\",\"showCircles\":false},{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"P99\",\"id\":\"3\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"interpolate\":\"linear\",\"showCircles\":false}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"percents\":[50],\"customLabel\":\"P50\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"percents\":[95],\"customLabel\":\"P95\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"percents\":[99],\"customLabel\":\"P99\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"startTime\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-http-status-time" '{
  "attributes": {
    "title": "Status HTTP — 2xx / 4xx / 5xx por tempo",
    "visState": "{\"title\":\"Status HTTP — 2xx / 4xx / 5xx por tempo\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Requisições\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Qtd\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"startTime\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"attributes.http.status_code\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-throughput-by-op" '{
  "attributes": {
    "title": "Vazão — Requisições por tempo e método HTTP",
    "visState": "{\"title\":\"Vazão — Requisições por tempo e método HTTP\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Requisições\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Qtd\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"startTime\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"attributes.http.method.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.status_code: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-latency-by-route-time" '{
  "attributes": {
    "title": "Latência Média por tempo e rota (ms)",
    "visState": "{\"title\":\"Latência Média por tempo e rota (ms)\",\"type\":\"line\",\"params\":{\"type\":\"line\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"ms\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"line\",\"mode\":\"normal\",\"data\":{\"label\":\"Média\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"interpolate\":\"linear\",\"showCircles\":false}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"Média (ms)\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"startTime\",\"useNormalizedOpenSearchInterval\":true,\"interval\":\"auto\",\"drop_partials\":false,\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"attributes.http.target.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.target: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-latency-by-route" '{
  "attributes": {
    "title": "P95 Latência por Rota/Endpoint (ms)",
    "visState": "{\"title\":\"P95 Latência por Rota/Endpoint (ms)\",\"type\":\"horizontal_bar\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":200},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"BottomAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"ms\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"normal\",\"data\":{\"label\":\"P95 (ms)\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true},{\"show\":false,\"type\":\"histogram\",\"mode\":\"normal\",\"data\":{\"label\":\"Qtd\",\"id\":\"3\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":false,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"P95 (ms)\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Qtd\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"attributes.http.target.keyword\",\"size\":15,\"order\":\"desc\",\"orderBy\":\"3\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.target: *\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-op-distribution" '{
  "attributes": {
    "title": "Distribuição por Nome de Operação",
    "visState": "{\"title\":\"Distribuição por Nome de Operação\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":false,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"name.keyword\",\"size\":20,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server\"},\"filter\":[]}"
    }
  }
}'

upsert "visualization" "viz-app-top-endpoints-full" '{
  "attributes": {
    "title": "Principais Endpoints — Volume e Latência",
    "visState": "{\"title\":\"Principais Endpoints — Volume e Latência\",\"type\":\"table\",\"params\":{\"perPage\":15,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"showTotal\":false,\"totalFunc\":\"sum\",\"percentageCol\":\"\"},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Requisições\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"customLabel\":\"Média (ms)\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"durationInMillis\",\"percents\":[95],\"customLabel\":\"P95 (ms)\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"attributes.http.target.keyword\",\"size\":20,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Endpoint\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"ip-traces\",\"query\":{\"language\":\"kuery\",\"query\":\"kind: Server AND attributes.http.target: *\"},\"filter\":[]}"
    }
  }
}'

# ---------------------------------------------------------------------------
# Dashboard — App Exemplo
# ---------------------------------------------------------------------------
upsert "dashboard" "dash-app-exemplo" '{
  "attributes": {
    "title": "App Exemplo",
    "description": "Latência, throughput, HTTP status e endpoints da aplicação",
    "panelsJSON": "[{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":12,\"h\":8,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":12,\"y\":0,\"w\":12,\"h\":8,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":12,\"h\":8,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":36,\"y\":0,\"w\":12,\"h\":8,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_4\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":8,\"w\":24,\"h\":14,\"i\":\"5\"},\"panelIndex\":\"5\",\"embeddableConfig\":{},\"panelRefName\":\"panel_5\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":8,\"w\":24,\"h\":14,\"i\":\"6\"},\"panelIndex\":\"6\",\"embeddableConfig\":{},\"panelRefName\":\"panel_6\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":22,\"w\":24,\"h\":14,\"i\":\"7\"},\"panelIndex\":\"7\",\"embeddableConfig\":{},\"panelRefName\":\"panel_7\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":22,\"w\":24,\"h\":14,\"i\":\"8\"},\"panelIndex\":\"8\",\"embeddableConfig\":{},\"panelRefName\":\"panel_8\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":36,\"w\":24,\"h\":14,\"i\":\"9\"},\"panelIndex\":\"9\",\"embeddableConfig\":{},\"panelRefName\":\"panel_9\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":36,\"w\":24,\"h\":14,\"i\":\"10\"},\"panelIndex\":\"10\",\"embeddableConfig\":{},\"panelRefName\":\"panel_10\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":50,\"w\":48,\"h\":16,\"i\":\"11\"},\"panelIndex\":\"11\",\"embeddableConfig\":{},\"panelRefName\":\"panel_11\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":0,\"y\":66,\"w\":24,\"h\":8,\"i\":\"12\"},\"panelIndex\":\"12\",\"embeddableConfig\":{},\"panelRefName\":\"panel_12\"},{\"version\":\"2.17.0\",\"gridData\":{\"x\":24,\"y\":66,\"w\":24,\"h\":8,\"i\":\"15\"},\"panelIndex\":\"15\",\"embeddableConfig\":{},\"panelRefName\":\"panel_15\"}]",
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
    {"name": "panel_1",  "type": "visualization", "id": "viz-app-latency-avg"},
    {"name": "panel_2",  "type": "visualization", "id": "viz-app-latency-p95-kpi"},
    {"name": "panel_3",  "type": "visualization", "id": "viz-app-total-requests"},
    {"name": "panel_4",  "type": "visualization", "id": "viz-app-total-errors"},
    {"name": "panel_5",  "type": "visualization", "id": "viz-app-latency-percentiles-time"},
    {"name": "panel_6",  "type": "visualization", "id": "viz-app-http-status-time"},
    {"name": "panel_7",  "type": "visualization", "id": "viz-app-throughput-by-op"},
    {"name": "panel_8",  "type": "visualization", "id": "viz-app-latency-by-route-time"},
    {"name": "panel_9",  "type": "visualization", "id": "viz-app-latency-by-route"},
    {"name": "panel_10", "type": "visualization", "id": "viz-app-op-distribution"},
    {"name": "panel_11", "type": "visualization", "id": "viz-app-top-endpoints-full"},
    {"name": "panel_12", "type": "visualization", "id": "viz-app-users-created"},
    {"name": "panel_15", "type": "visualization", "id": "viz-app-users-viewed"}
  ]
}'
