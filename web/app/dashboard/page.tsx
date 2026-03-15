import {
  getServices,
  getServiceCapabilities,
  getKpis,
  getRequestsOverTime,
  getLatencyOverTime,
  getStatusOverTime,
  getLogCountOverTime,
  getThroughputByMethod,
  getLatencyByRouteOverTime,
  getLatencyByRoute,
  getOpDistribution,
  getTopEndpoints,
  getAppointmentsOverTime,
  type ServiceCapabilities,
} from "./actions"
import { DashboardClient } from "./_components/dashboard-client"

// Página sempre dinâmica — dados dependem dos query params
export const dynamic = "force-dynamic"

export default async function DashboardPage(props: {
  searchParams: Promise<{ service?: string; from?: string; to?: string }>
}) {
  const sp = await props.searchParams
  const service = sp.service ?? ""
  const from    = sp.from ?? "now-1h"
  const to      = sp.to  ?? "now"
  const svc     = service || undefined

  const defaultCaps: ServiceCapabilities = { hasUserOps: true, hasAppointmentOps: true }

  const [
    services, capabilities, kpis, requests, latency, status,
    logs, throughput, latencyRouteTime, latencyRoute, opDist, topEndpoints, appointments,
  ] = await Promise.allSettled([
    getServices(),
    svc ? getServiceCapabilities(svc) : Promise.resolve(defaultCaps),
    getKpis(from, to, svc),
    getRequestsOverTime(from, to, svc),
    getLatencyOverTime(from, to, svc),
    getStatusOverTime(from, to, svc),
    getLogCountOverTime(from, to),
    getThroughputByMethod(from, to, svc),
    getLatencyByRouteOverTime(from, to, svc),
    getLatencyByRoute(from, to, svc),
    getOpDistribution(from, to, svc),
    getTopEndpoints(from, to, svc),
    getAppointmentsOverTime(from, to, svc),
  ])

  return (
    <DashboardClient
      // estado da URL (passado como props — sem useSearchParams no cliente)
      selectedService={service}
      from={from}
      to={to}
      // metadados
      services={services.status        === "fulfilled" ? services.value        : []}
      capabilities={capabilities.status === "fulfilled" ? capabilities.value   : defaultCaps}
      // dados
      kpiData={kpis.status                   === "fulfilled" ? kpis.value                   : null}
      requestsData={requests.status          === "fulfilled" ? requests.value               : []}
      latencyData={latency.status            === "fulfilled" ? latency.value                : []}
      statusData={status.status              === "fulfilled" ? status.value                 : []}
      logsData={logs.status                  === "fulfilled" ? logs.value                   : []}
      throughputData={throughput.status      === "fulfilled" ? throughput.value             : []}
      latencyRouteTimeData={latencyRouteTime.status === "fulfilled" ? latencyRouteTime.value : []}
      latencyRouteData={latencyRoute.status  === "fulfilled" ? latencyRoute.value           : []}
      opDistData={opDist.status              === "fulfilled" ? opDist.value                 : []}
      topEndpointsData={topEndpoints.status  === "fulfilled" ? topEndpoints.value           : []}
      appointmentsOverTimeData={appointments.status === "fulfilled" ? appointments.value    : []}
    />
  )
}
