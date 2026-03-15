"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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

const chartConfig = {
  "2xx": {
    label: "2xx Sucesso",
    color: "hsl(142 71% 45%)",
  },
  "4xx": {
    label: "4xx Cliente",
    color: "hsl(38 92% 50%)",
  },
  "5xx": {
    label: "5xx Servidor",
    color: "hsl(0 72% 51%)",
  },
} satisfies ChartConfig

interface StatusChartProps {
  data: TimePoint[]
  filterLabel: string
}

export function StatusChart({ data, filterLabel }: StatusChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => (d["2xx"] as number) === 0 && (d["5xx"] as number) === 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status HTTP por Tempo</CardTitle>
        <CardDescription>Distribuição de respostas 2xx / 4xx / 5xx · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <ChartContainer id="http-status" config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fill2xx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-2xx)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-2xx)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fill4xx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-4xx)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-4xx)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fill5xx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-5xx)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-5xx)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="2xx"
                stroke="var(--color-2xx)"
                fill="url(#fill2xx)"
                strokeWidth={2}
                dot={false}
                stackId="a"
              />
              <Area
                type="monotone"
                dataKey="4xx"
                stroke="var(--color-4xx)"
                fill="url(#fill4xx)"
                strokeWidth={2}
                dot={false}
                stackId="a"
              />
              <Area
                type="monotone"
                dataKey="5xx"
                stroke="var(--color-5xx)"
                fill="url(#fill5xx)"
                strokeWidth={2}
                dot={false}
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
