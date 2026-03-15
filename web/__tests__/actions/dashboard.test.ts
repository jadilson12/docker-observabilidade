import { describe, it, expect, vi, beforeEach } from "vitest"
import { getServices, getServiceCapabilities, getKpis } from "@/app/dashboard/actions"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

function mockOk(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getServices", () => {
  it("retorna lista de serviços das aggregations", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOk({
        aggregations: {
          services: {
            buckets: [
              { key: "aplication-exemple-api" },
              { key: "aplication-exemple-web" },
            ],
          },
        },
      })
    )

    const result = await getServices()

    expect(result).toEqual(["aplication-exemple-api", "aplication-exemple-web"])
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("_search"),
      expect.objectContaining({ method: "POST" })
    )
  })

  it("retorna array vazio quando não há aggregations", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ aggregations: { services: { buckets: [] } } }))

    const result = await getServices()

    expect(result).toEqual([])
  })

  it("retorna array vazio quando fetch falha", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await getServices()

    expect(result).toEqual([])
  })

  it("retorna array vazio quando OpenSearch responde com erro", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })

    const result = await getServices()

    expect(result).toEqual([])
  })
})

describe("getServiceCapabilities", () => {
  it("detecta operações de usuários e agendamentos", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOk({
        aggregations: {
          user_ops: { doc_count: 10 },
          appt_ops: { doc_count: 5 },
        },
      })
    )

    const result = await getServiceCapabilities("aplication-exemple-api")

    expect(result.hasUserOps).toBe(true)
    expect(result.hasAppointmentOps).toBe(true)
  })

  it("retorna false quando não há operações registradas", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOk({
        aggregations: {
          user_ops: { doc_count: 0 },
          appt_ops: { doc_count: 0 },
        },
      })
    )

    const result = await getServiceCapabilities("aplication-exemple-api")

    expect(result.hasUserOps).toBe(false)
    expect(result.hasAppointmentOps).toBe(false)
  })

  it("retorna false em caso de erro", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await getServiceCapabilities("aplication-exemple-api")

    expect(result).toEqual({ hasUserOps: false, hasAppointmentOps: false })
  })
})

describe("getKpis", () => {
  const mockKpisResponse = {
    aggregations: {
      total: { value: 100 },
      errors: { doc_count: 5 },
      avg_latency: { value: 120 },
      percentiles: { values: { "95.0": 300 } },
      users_created: { doc_count: 10 },
      users_deleted: { doc_count: 2 },
      users_updated: { doc_count: 3 },
      users_viewed: { doc_count: 50 },
      appointments_created: { doc_count: 7 },
      appointments_deleted: { doc_count: 1 },
      appointments_updated: { doc_count: 2 },
      appointments_viewed: { doc_count: 20 },
    },
  }

  it("mapeia corretamente os campos da resposta", async () => {
    mockFetch.mockResolvedValueOnce(mockOk(mockKpisResponse))

    const result = await getKpis()

    expect(result.totalRequests).toBe(100)
    expect(result.totalErrors).toBe(5)
    expect(result.avgLatencyMs).toBe(120)
    expect(result.p95LatencyMs).toBe(300)
    expect(result.errorRate).toBe(5)
    expect(result.usersCreated).toBe(10)
    expect(result.appointmentsCreated).toBe(7)
  })

  it("inclui filtro de serviço quando serviceName é passado", async () => {
    mockFetch.mockResolvedValueOnce(mockOk(mockKpisResponse))

    await getKpis("now-1h", "now", "aplication-exemple-api")

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const filters = body.query.bool.filter
    expect(filters).toContainEqual({ term: { "serviceName.keyword": "aplication-exemple-api" } })
  })

  it("inclui wildcard de prefixo quando serviceName é omitido", async () => {
    mockFetch.mockResolvedValueOnce(mockOk(mockKpisResponse))

    await getKpis()

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const filters = body.query.bool.filter
    expect(filters).toContainEqual({
      wildcard: { "serviceName.keyword": "aplication-exemple-*" },
    })
  })

  it("inclui o range de tempo correto na query", async () => {
    mockFetch.mockResolvedValueOnce(mockOk(mockKpisResponse))

    await getKpis("now-30m", "now")

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const filters = body.query.bool.filter
    expect(filters).toContainEqual({
      range: { "@timestamp": { gte: "now-30m", lte: "now" } },
    })
  })
})
