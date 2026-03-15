"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
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

const ROUTE_COLORS = [
  "hsl(220 70% 50%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 55%)",
  "hsl(0 72% 51%)",
]

interface LatencyRouteTimeChartProps {
  data: TimePoint[]
  filterLabel: string
}

export function LatencyRouteTimeChart({ data, filterLabel }: LatencyRouteTimeChartProps) {
  const routes = data.length > 0
    ? Object.keys(data[0]).filter((k) => k !== "time")
    : []

  const chartConfig = Object.fromEntries(
    routes.map((r, i) => [r, { label: r, color: ROUTE_COLORS[i % ROUTE_COLORS.length] }])
  ) satisfies ChartConfig

  const isEmpty = data.length === 0 || routes.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latência Média por Rota (ms)</CardTitle>
        <CardDescription>Latência média por tempo e rota · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <ChartContainer id="latency-by-route-time" config={chartConfig} className="h-[200px] w-full">
            <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
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
              {routes.map((r, i) => (
                <Line
                  key={r}
                  type="monotone"
                  dataKey={r}
                  stroke={ROUTE_COLORS[i % ROUTE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
