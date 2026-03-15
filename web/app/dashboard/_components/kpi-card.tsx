import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  variant?: "default" | "danger" | "warning" | "success"
}

export function KpiCard({ title, value, subtitle, icon: Icon, variant = "default" }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon
          className={cn("h-4 w-4", {
            "text-muted-foreground": variant === "default",
            "text-destructive": variant === "danger",
            "text-yellow-500": variant === "warning",
            "text-green-500": variant === "success",
          })}
        />
      </CardHeader>
      <CardContent>
        <div
          className={cn("text-2xl font-bold", {
            "text-foreground": variant === "default",
            "text-destructive": variant === "danger",
            "text-yellow-500": variant === "warning",
            "text-green-600 dark:text-green-400": variant === "success",
          })}
        >
          {value}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
