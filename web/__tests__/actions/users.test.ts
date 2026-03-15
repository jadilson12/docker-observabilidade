import { describe, it, expect, vi, beforeEach } from "vitest"
import { getUsers, createUser, updateUser, deleteUser } from "@/app/users/actions"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

function mockOk(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response)
}

function mockError(status: number, body: unknown = {}) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) } as Response)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getUsers", () => {
  it("retorna lista paginada de usuários", async () => {
    const payload = {
      data: [{ id: "1", name: "João", email: "joao@test.com", createdAt: "", updatedAt: "" }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false },
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) })

    const result = await getUsers(1, 10)

    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe("João")
    expect(result.meta.total).toBe(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/users?page=1&limit=10"),
      expect.objectContaining({ cache: "no-store" })
    )
  })

  it("lança erro quando a resposta não é ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(getUsers()).rejects.toThrow("Falha ao buscar usuários")
  })
})

describe("createUser", () => {
  it("retorna objeto vazio quando criado com sucesso", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: "2", name: "Maria", email: "maria@test.com" }))

    const result = await createUser({ name: "Maria", email: "maria@test.com" })

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/users"),
      expect.objectContaining({ method: "POST" })
    )
  })

  it("retorna error quando a API responde com erro", async () => {
    mockFetch.mockResolvedValueOnce(mockError(422, { message: "E-mail já cadastrado" }))

    const result = await createUser({ name: "Maria", email: "maria@test.com" })

    expect(result.error).toBe("E-mail já cadastrado")
  })

  it("retorna error de conexão quando fetch lança exceção", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await createUser({ name: "Maria", email: "maria@test.com" })

    expect(result.error).toBe("Erro de conexão com a API")
  })
})

describe("updateUser", () => {
  it("retorna objeto vazio quando atualizado com sucesso", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: "1", name: "João Atualizado" }))

    const result = await updateUser("1", { name: "João Atualizado" })

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/1"),
      expect.objectContaining({ method: "PUT" })
    )
  })

  it("retorna error quando usuário não encontrado", async () => {
    mockFetch.mockResolvedValueOnce(mockError(404, { message: "Usuário não encontrado" }))

    const result = await updateUser("999", { name: "X" })

    expect(result.error).toBe("Usuário não encontrado")
  })

  it("retorna error de conexão quando fetch lança exceção", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await updateUser("1", { name: "X" })

    expect(result.error).toBe("Erro de conexão com a API")
  })
})

describe("deleteUser", () => {
  it("retorna objeto vazio quando removido com sucesso", async () => {
    mockFetch.mockResolvedValueOnce(mockOk(null))

    const result = await deleteUser("1")

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/1"),
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("retorna error quando a remoção falha", async () => {
    mockFetch.mockResolvedValueOnce(mockError(400))

    const result = await deleteUser("1")

    expect(result.error).toBe("Falha ao remover usuário")
  })

  it("retorna error de conexão quando fetch lança exceção", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const result = await deleteUser("1")

    expect(result.error).toBe("Erro de conexão com a API")
  })
})
