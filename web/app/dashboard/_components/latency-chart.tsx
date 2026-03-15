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
  p50: {
    label: "P50",
    color: "hsl(142 71% 45%)",
  },
  p95: {
    label: "P95",
    color: "hsl(38 92% 50%)",
  },
  p99: {
    label: "P99",
    color: "hsl(0 72% 51%)",
  },
} satisfies ChartConfig

interface LatencyChartProps {
  data: TimePoint[]
  filterLabel: string
}

export function LatencyChart({ data, filterLabel }: LatencyChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => (d.p95 as number) === 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latência por Percentil (ms)</CardTitle>
        <CardDescription>P50 / P95 / P99 · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <ChartContainer id="latency-percentiles" config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillP50" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-p50)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-p50)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillP95" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-p95)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-p95)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillP99" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-p99)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-p99)" stopOpacity={0.05} />
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
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={40}
                tickFormatter={(v) => `${v}ms`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name) => (
                      <span className="font-mono">
                        {name}: {value}ms
                      </span>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="p50"
                stroke="var(--color-p50)"
                fill="url(#fillP50)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="p95"
                stroke="var(--color-p95)"
                fill="url(#fillP95)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="p99"
                stroke="var(--color-p99)"
                fill="url(#fillP99)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
