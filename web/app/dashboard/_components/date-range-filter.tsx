"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface FilterRange {
  label: string
  from: string
  to: string
}

const PRESETS: FilterRange[] = [
  { label: "15 min", from: "now-15m", to: "now" },
  { label: "1 hora", from: "now-1h", to: "now" },
  { label: "6 horas", from: "now-6h", to: "now" },
  { label: "24 horas", from: "now-24h", to: "now" },
  { label: "7 dias", from: "now-7d", to: "now" },
  { label: "30 dias", from: "now-30d", to: "now" },
]

interface DateRangeFilterProps {
  value: FilterRange
  onChange: (range: FilterRange) => void
  cooldown: number
}

export function DateRangeFilter({ value, onChange, cooldown }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [customRange, setCustomRange] = useState<DateRange | undefined>()

  function selectPreset(preset: FilterRange) {
    setCustomRange(undefined)
    onChange(preset)
    setOpen(false)
  }

  function applyCustom() {
    if (!customRange?.from) return
    const from = customRange.from.toISOString()
    const to = customRange.to ? customRange.to.toISOString() : new Date().toISOString()
    const fromLabel = format(customRange.from, "dd/MM/yy HH:mm", { locale: ptBR })
    const toLabel = format(customRange.to ?? new Date(), "dd/MM/yy HH:mm", { locale: ptBR })
    onChange({ label: `${fromLabel} – ${toLabel}`, from, to })
    setOpen(false)
  }

  const isCustomActive = !PRESETS.some((p) => p.from === value.from && p.to === value.to)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 text-sm font-normal",
            cooldown > 0 && "opacity-70 cursor-not-allowed"
          )}
          disabled={cooldown > 0}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{value.label}</span>
          {cooldown > 0 && (
            <span className="text-xs text-muted-foreground">({cooldown}s)</span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col border-r p-2 gap-0.5 min-w-[110px]">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Período</p>
            {PRESETS.map((preset) => {
              const active = value.from === preset.from && value.to === preset.to
              return (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    "text-sm text-left px-2 py-1.5 rounded-md transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
            <div className="border-t my-1" />
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Personalizado</p>
            {isCustomActive && (
              <div className="px-2 py-1 text-xs text-primary font-medium truncate max-w-[110px]">
                {value.label}
              </div>
            )}
          </div>

          {/* Calendar */}
          <div className="p-2">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={setCustomRange}
              numberOfMonths={2}
              locale={ptBR}
              disabled={{ after: new Date() }}
            />
            <div className="flex items-center justify-between border-t pt-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground">
                {customRange?.from
                  ? customRange.to
                    ? `${format(customRange.from, "dd/MM/yy")} – ${format(customRange.to, "dd/MM/yy")}`
                    : format(customRange.from, "dd/MM/yy")
                  : "Selecione um intervalo"}
              </span>
              <Button size="sm" onClick={applyCustom} disabled={!customRange?.from}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { PRESETS }
