"use client"

import { Cell, Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpEntry } from "../actions"

const OP_COLORS = [
  "hsl(220 70% 50%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 55%)",
  "hsl(0 72% 51%)",
  "hsl(180 60% 45%)",
  "hsl(60 80% 45%)",
  "hsl(320 65% 55%)",
]

interface OpDistributionChartProps {
  data: OpEntry[]
  filterLabel: string
}

export function OpDistributionChart({ data, filterLabel }: OpDistributionChartProps) {
  // Top 8 by count
  const top = [...data].sort((a, b) => b.count - a.count).slice(0, 8)
  const isEmpty = top.length === 0

  const chartConfig = Object.fromEntries(
    top.map((op, i) => [op.name, { label: op.name, color: OP_COLORS[i % OP_COLORS.length] }])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Operação</CardTitle>
        <CardDescription>Volume por nome de operação · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <ChartContainer id="op-distribution" config={chartConfig} className="h-[200px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={top}
                dataKey="count"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {top.map((_, i) => (
                  <Cell key={i} fill={OP_COLORS[i % OP_COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="flex-wrap gap-1 text-[10px]"
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
