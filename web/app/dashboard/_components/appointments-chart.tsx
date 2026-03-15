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

const chartConfig = {
  created: { label: "Created",  color: "hsl(142 71% 45%)" },
  viewed:  { label: "Viewed",   color: "hsl(220 70% 50%)" },
  updated: { label: "Updated",  color: "hsl(38 92% 50%)"  },
  deleted: { label: "Deleted",  color: "hsl(0 72% 51%)"   },
} satisfies ChartConfig

interface AppointmentsChartProps {
  data: TimePoint[]
  filterLabel: string
}

export function AppointmentsChart({ data, filterLabel }: AppointmentsChartProps) {
  const hasData = data.some((d) =>
    (d.created as number) > 0 || (d.viewed as number) > 0 ||
    (d.updated as number) > 0 || (d.deleted as number) > 0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appointments Activity</CardTitle>
        <CardDescription>CRUD operations over time · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No data for the selected period
          </div>
        ) : (
          <ChartContainer id="appointments-over-time" config={chartConfig} className="h-[200px] w-full">
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
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {(["created", "viewed", "updated", "deleted"] as const).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
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
