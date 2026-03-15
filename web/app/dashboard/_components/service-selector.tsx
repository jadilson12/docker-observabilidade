"use client"

import { Button } from "@/components/ui/button"
import { Layers } from "lucide-react"

interface ServiceSelectorProps {
  services: string[]
  value: string
  onChange: (value: string) => void
}

function shortName(s: string) {
  // Remove common prefixes for display brevity
  return s.replace(/^aplication-exemple-/, "").replace(/^aplicacao-exemplo-/, "").replace(/^demo-/, "")
}

export function ServiceSelector({ services, value, onChange }: ServiceSelectorProps) {
  const all = [{ id: "", label: "Todos" }, ...services.map((s) => ({ id: s, label: shortName(s) }))]

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Layers className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" />
      {all.map(({ id, label }) => (
        <Button
          key={id}
          variant="ghost"
          size="sm"
          onClick={() => onChange(id)}
          className={`h-6 px-2.5 text-xs rounded-md transition-all ${
            value === id
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
