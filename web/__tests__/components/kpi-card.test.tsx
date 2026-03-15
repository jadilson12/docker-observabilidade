import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { KpiCard } from "@/app/dashboard/_components/kpi-card"
import { Activity } from "lucide-react"

describe("KpiCard", () => {
  it("exibe title e value", () => {
    render(<KpiCard title="Total Requests" value={42} icon={Activity} />)

    expect(screen.getByText("Total Requests")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("exibe subtitle quando fornecido", () => {
    render(<KpiCard title="Latência" value="120ms" subtitle="média p50" icon={Activity} />)

    expect(screen.getByText("média p50")).toBeInTheDocument()
  })

  it("não exibe subtitle quando omitido", () => {
    render(<KpiCard title="Erros" value={0} icon={Activity} />)

    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument()
  })

  it("aplica classe text-destructive na variante danger", () => {
    const { container } = render(
      <KpiCard title="Erros" value={10} icon={Activity} variant="danger" />
    )

    expect(container.querySelector(".text-destructive")).toBeInTheDocument()
  })

  it("aplica classe text-yellow-500 na variante warning", () => {
    const { container } = render(
      <KpiCard title="Aviso" value={5} icon={Activity} variant="warning" />
    )

    expect(container.querySelector(".text-yellow-500")).toBeInTheDocument()
  })

  it("aplica classe text-green-500 na variante success", () => {
    const { container } = render(
      <KpiCard title="OK" value={99} icon={Activity} variant="success" />
    )

    expect(container.querySelector(".text-green-500")).toBeInTheDocument()
  })

  it("aceita value como string formatada", () => {
    render(<KpiCard title="P95" value="350ms" icon={Activity} />)

    expect(screen.getByText("350ms")).toBeInTheDocument()
  })
})
