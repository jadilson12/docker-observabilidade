"use server"

import { revalidatePath } from "next/cache"

if (!process.env.API_URL) {
  throw new Error("API_URL is required. Add it to your .env file (see web/.env.example).")
}
const API_URL = process.env.API_URL

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedUsers {
  data: User[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export async function getUsers(page = 1, limit = 10): Promise<PaginatedUsers> {
  const res = await fetch(`${API_URL}/users?page=${page}&limit=${limit}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Falha ao buscar usuários")
  return res.json()
}

export async function createUser(data: { name: string; email: string }): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body?.message ?? "Falha ao criar usuário" }
    }
    revalidatePath("/users")
    return {}
  } catch {
    return { error: "Erro de conexão com a API" }
  }
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string }
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body?.message ?? "Falha ao atualizar usuário" }
    }
    revalidatePath("/users")
    return {}
  } catch {
    return { error: "Erro de conexão com a API" }
  }
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      return { error: "Falha ao remover usuário" }
    }
    revalidatePath("/users")
    return {}
  } catch {
    return { error: "Erro de conexão com a API" }
  }
}
