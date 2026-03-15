"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TimePoint } from "../actions"

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
const COLORS = [
  "hsl(220 70% 50%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 55%)",
  "hsl(0 72% 51%)",
]

const chartConfig = Object.fromEntries(
  METHODS.map((m, i) => [m, { label: m, color: COLORS[i] }])
) satisfies ChartConfig

interface ThroughputChartProps {
  data: TimePoint[]
  filterLabel: string
}

export function ThroughputChart({ data, filterLabel }: ThroughputChartProps) {
  const presentMethods = METHODS.filter((m) => data.some((d) => (d[m] as number) > 0))
  const isEmpty = data.length === 0 || presentMethods.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vazão por Método HTTP</CardTitle>
        <CardDescription>Requisições por tempo e método · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <ChartContainer id="throughput-by-method" config={chartConfig} className="h-[200px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {presentMethods.map((m) => (
                <Bar key={m} dataKey={m} stackId="a" fill={`var(--color-${m})`} radius={0} />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
