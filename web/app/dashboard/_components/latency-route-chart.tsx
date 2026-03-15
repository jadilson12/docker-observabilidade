"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RouteLatency } from "../actions"

const chartConfig = {
  p95: {
    label: "P95 (ms)",
    color: "hsl(38 92% 50%)",
  },
} satisfies ChartConfig

interface LatencyRouteChartProps {
  data: RouteLatency[]
  filterLabel: string
}

export function LatencyRouteChart({ data, filterLabel }: LatencyRouteChartProps) {
  const isEmpty = data.length === 0

  // Sort by count desc, take top 10
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">P95 Latência por Endpoint (ms)</CardTitle>
        <CardDescription>Top endpoints por volume · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <ChartContainer id="latency-by-route" config={chartConfig} className="h-[200px] w-full">
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <YAxis
                dataKey="route"
                type="category"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={100}
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 14)}…` : v)}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
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
              <Bar dataKey="p95" fill="var(--color-p95)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
