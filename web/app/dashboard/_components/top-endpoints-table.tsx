"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EndpointRow } from "../actions"

interface TopEndpointsTableProps {
  data: EndpointRow[]
  filterLabel: string
}

export function TopEndpointsTable({ data, filterLabel }: TopEndpointsTableProps) {
  const isEmpty = data.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Principais Endpoints — Volume e Latência</CardTitle>
        <CardDescription>Top endpoints por requisições · {filterLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Endpoint</th>
                  <th className="pb-2 text-right font-medium">Requisições</th>
                  <th className="pb-2 text-right font-medium">Média (ms)</th>
                  <th className="pb-2 text-right font-medium">P95 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.endpoint} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 font-mono text-xs">{row.endpoint}</td>
                    <td className="py-2 text-right tabular-nums">{row.requests.toLocaleString("pt-BR")}</td>
                    <td className="py-2 text-right tabular-nums">{row.avgMs}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className={row.p95Ms > 500 ? "text-amber-500 font-medium" : ""}>
                        {row.p95Ms}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
