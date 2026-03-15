"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserFormDialog } from "./user-form-dialog"
import { deleteUser, type User, type PaginatedUsers } from "../actions"
import { Pencil, Trash2, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

interface UsersTableProps {
  initialData: PaginatedUsers
}

export function UsersTable({ initialData }: UsersTableProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { data: users, meta } = initialData

  function openCreate() {
    setSelectedUser(null)
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  function handleSuccess() {
    router.refresh()
  }

  function handleDelete(user: User) {
    if (!confirm(`Remover "${user.name}"?`)) return
    setDeletingId(user.id)
    startTransition(async () => {
      await deleteUser(user.id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function goToPage(page: number) {
    router.push(`/users?page=${page}`)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {meta.total} usuário{meta.total !== 1 ? "s" : ""} no total
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus />
          Novo usuário
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(user)}
                        disabled={isPending}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user)}
                        disabled={isPending}
                        aria-label="Remover"
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(meta.page - 1)}
            disabled={meta.page <= 1 || isPending}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(meta.page + 1)}
            disabled={meta.page >= meta.totalPages || isPending}
          >
            <ChevronRight />
          </Button>
        </div>
      )}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
