"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

function formatRemaining(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}min`
}

interface RefreshCountdownProps {
  interval: number
  onRefresh: () => void
}

export function RefreshCountdown({ interval, onRefresh }: RefreshCountdownProps) {
  const [remaining, setRemaining] = useState(interval)
  const startRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  })

  useEffect(() => {
    startRef.current = Date.now()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(interval)

    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const left = interval - elapsed

      if (left <= 0) {
        // reinicia o ciclo em vez de parar
        startRef.current = Date.now()
        setRemaining(interval)
        onRefreshRef.current()
      } else {
        setRemaining(left)
      }
    }, 250)

    return () => clearInterval(tick)
  }, [interval])

  const progress = (remaining / interval) * 100
  const isClose = remaining <= 5

  return (
    <div className="space-y-1.5">
      <span
        className={cn(
          "text-xs transition-colors duration-300",
          isClose ? "text-amber-500 font-medium" : "text-muted-foreground"
        )}
      >
        Próxima atualização em{" "}
        <span className="tabular-nums font-semibold">{formatRemaining(remaining)}</span>
      </span>
      <div className="h-0.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-[250ms] ease-linear",
            isClose ? "bg-amber-500 animate-pulse" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
