"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { RefreshCountdown } from "./refresh-countdown"
import { IntervalSelector } from "./interval-selector"
import { DateRangeFilter, PRESETS, type FilterRange } from "./date-range-filter"
import { KpiCard } from "./kpi-card"
import { RequestsChart } from "./requests-chart"
import { LatencyChart } from "./latency-chart"
import { StatusChart } from "./status-chart"
import { LogsChart } from "./logs-chart"
import { ThroughputChart } from "./throughput-chart"
import { LatencyRouteTimeChart } from "./latency-route-time-chart"
import { LatencyRouteChart } from "./latency-route-chart"
import { OpDistributionChart } from "./op-distribution-chart"
import { TopEndpointsTable } from "./top-endpoints-table"
import { AppointmentsChart } from "./appointments-chart"
import { ServiceSelector } from "./service-selector"
import type {
  KpiData,
  TimePoint,
  RouteLatency,
  OpEntry,
  EndpointRow,
  ServiceCapabilities,
} from "../actions"
import {
  Activity, AlertTriangle, Calendar, CalendarCheck, CalendarMinus, CalendarPlus,
  Clock, Eye, Loader2, RefreshCw, TrendingUp, UserCheck, UserMinus, UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface DashboardClientProps {
  // estado da URL (lido no server, passado como props)
  selectedService: string
  from: string
  to: string
  // metadados
  services: string[]
  capabilities: ServiceCapabilities
  // dados (todos fetchados no servidor)
  kpiData: KpiData | null
  requestsData: TimePoint[]
  latencyData: TimePoint[]
  statusData: TimePoint[]
  logsData: TimePoint[]
  throughputData: TimePoint[]
  latencyRouteTimeData: TimePoint[]
  latencyRouteData: RouteLatency[]
  opDistData: OpEntry[]
  topEndpointsData: EndpointRow[]
  appointmentsOverTimeData: TimePoint[]
}

export function DashboardClient(props: DashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [refreshInterval, setRefreshInterval] = useState(30)

  // filtro atual derivado dos props (vindos da URL)
  const filter: FilterRange =
    PRESETS.find((p) => p.from === props.from) ??
    { from: props.from, to: props.to, label: "Personalizado" }

  // constrói URL preservando apenas os params relevantes
  function buildUrl(updates: Record<string, string>): string {
    const params = new URLSearchParams()
    const merged = {
      from: props.from,
      to: props.to !== "now" ? props.to : "",
      service: props.selectedService,
      ...updates,
    }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    const qs = params.toString()
    return qs ? `/dashboard?${qs}` : "/dashboard"
  }

  const handleFilterChange = (range: FilterRange) => {
    startTransition(() => {
      router.push(buildUrl({ from: range.from, to: range.to !== "now" ? range.to : "" }))
    })
  }

  const handleServiceChange = (service: string) => {
    startTransition(() => {
      router.push(buildUrl({ service }))
    })
  }

  const handleRefresh = () => {
    startTransition(() => { router.refresh() })
  }

  // visibilidade condicional por capacidades do serviço
  const showUserOps = !props.selectedService || props.capabilities.hasUserOps
  const showAppointmentOps = !props.selectedService || props.capabilities.hasAppointmentOps

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm">Observabilidade</span>
            <nav className="flex items-center gap-4 text-sm">
              <span className="text-foreground font-medium border-b-2 border-primary pb-0.5">Dashboard</span>
              <Link href="/users" className="text-muted-foreground hover:text-foreground transition-colors">
                Usuários
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Dashboard
                {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {props.selectedService
                  ? `Serviço: ${props.selectedService} · métricas via OpenSearch`
                  : "Todos os serviços · métricas via OpenSearch"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending}
                className="h-8 w-8 p-0"
                title="Atualizar agora"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              </Button>
              <DateRangeFilter value={filter} onChange={handleFilterChange} cooldown={0} />
              <IntervalSelector value={refreshInterval} onChange={setRefreshInterval} />
            </div>
          </div>

          {/* Seletor de serviço */}
          {props.services.length > 0 && (
            <ServiceSelector
              services={props.services}
              value={props.selectedService}
              onChange={handleServiceChange}
            />
          )}

          <RefreshCountdown interval={refreshInterval} onRefresh={handleRefresh} />
        </div>

        {/* KPIs — Performance */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            title="Total de Requisições"
            value={props.kpiData ? props.kpiData.totalRequests.toLocaleString("pt-BR") : "—"}
            subtitle={filter.label}
            icon={TrendingUp}
            variant="default"
          />
          <KpiCard
            title="Erros HTTP (≥ 400)"
            value={props.kpiData ? props.kpiData.totalErrors.toLocaleString("pt-BR") : "—"}
            subtitle={props.kpiData ? `${props.kpiData.errorRate}% da taxa · ${filter.label}` : filter.label}
            icon={AlertTriangle}
            variant={props.kpiData && props.kpiData.errorRate > 5 ? "danger" : "default"}
          />
          <KpiCard
            title="Latência Média"
            value={props.kpiData ? `${props.kpiData.avgLatencyMs} ms` : "—"}
            subtitle={filter.label}
            icon={Clock}
            variant={props.kpiData && props.kpiData.avgLatencyMs > 500 ? "warning" : "success"}
          />
          <KpiCard
            title="P95 Latência"
            value={props.kpiData ? `${props.kpiData.p95LatencyMs} ms` : "—"}
            subtitle={filter.label}
            icon={Activity}
            variant={props.kpiData && props.kpiData.p95LatencyMs > 1000 ? "danger" : "default"}
          />
        </div>

        {/* KPIs — Operações de Usuário */}
        {showUserOps && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              title="Usuários Criados"
              value={props.kpiData ? props.kpiData.usersCreated.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={UserPlus}
              variant="success"
            />
            <KpiCard
              title="Usuários Deletados"
              value={props.kpiData ? props.kpiData.usersDeleted.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={UserMinus}
              variant="default"
            />
            <KpiCard
              title="Usuários Atualizados"
              value={props.kpiData ? props.kpiData.usersUpdated.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={UserCheck}
              variant="default"
            />
            <KpiCard
              title="Usuários Visualizados"
              value={props.kpiData ? props.kpiData.usersViewed.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={Eye}
              variant="default"
            />
          </div>
        )}

        {/* KPIs — Appointments */}
        {showAppointmentOps && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              title="Appointments Criados"
              value={props.kpiData ? props.kpiData.appointmentsCreated.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={CalendarPlus}
              variant="success"
            />
            <KpiCard
              title="Appointments Deletados"
              value={props.kpiData ? props.kpiData.appointmentsDeleted.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={CalendarMinus}
              variant="default"
            />
            <KpiCard
              title="Appointments Atualizados"
              value={props.kpiData ? props.kpiData.appointmentsUpdated.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={CalendarCheck}
              variant="default"
            />
            <KpiCard
              title="Appointments Visualizados"
              value={props.kpiData ? props.kpiData.appointmentsViewed.toLocaleString("pt-BR") : "—"}
              subtitle={filter.label}
              icon={Calendar}
              variant="default"
            />
          </div>
        )}

        {/* Latência percentis + Status HTTP */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LatencyChart data={props.latencyData} filterLabel={filter.label} />
          <StatusChart data={props.statusData} filterLabel={filter.label} />
        </div>

        {/* Vazão por método + Latência por rota ao longo do tempo */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ThroughputChart data={props.throughputData} filterLabel={filter.label} />
          <LatencyRouteTimeChart data={props.latencyRouteTimeData} filterLabel={filter.label} />
        </div>

        {/* P95 por endpoint + Distribuição de operações */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LatencyRouteChart data={props.latencyRouteData} filterLabel={filter.label} />
          <OpDistributionChart data={props.opDistData} filterLabel={filter.label} />
        </div>

        {/* Tabela top endpoints */}
        <TopEndpointsTable data={props.topEndpointsData} filterLabel={filter.label} />

        {/* Appointments ao longo do tempo */}
        {showAppointmentOps && (
          <AppointmentsChart data={props.appointmentsOverTimeData} filterLabel={filter.label} />
        )}

        {/* Requisições por serviço + Logs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RequestsChart data={props.requestsData} filterLabel={filter.label} />
          <LogsChart data={props.logsData} filterLabel={filter.label} />
        </div>
      </main>
    </div>
  )
}
