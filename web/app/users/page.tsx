import { getUsers } from "./actions"
import { UsersTable } from "./_components/users-table"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { Users } from "lucide-react"

interface UsersPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1

  let data
  let errorMessage = ""

  try {
    data = await getUsers(currentPage, 10)
  } catch {
    errorMessage = "Não foi possível conectar à API. Verifique se o serviço está em execução."
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Início
            </Link>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium text-sm">Usuários</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os usuários do sistema</p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : (
          <UsersTable initialData={data!} />
        )}
      </main>
    </div>
  )
}
