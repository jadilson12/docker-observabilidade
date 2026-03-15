import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ServiceSelector } from "@/app/dashboard/_components/service-selector"

const services = ["aplication-exemple-api", "aplication-exemple-web", "demo-service"]

describe("ServiceSelector", () => {
  it("exibe a opção 'Todos' sempre", () => {
    render(<ServiceSelector services={[]} value="" onChange={vi.fn()} />)

    expect(screen.getByText("Todos")).toBeInTheDocument()
  })

  it("exibe todos os serviços passados", () => {
    render(<ServiceSelector services={services} value="" onChange={vi.fn()} />)

    expect(screen.getAllByRole("button")).toHaveLength(services.length + 1) // +1 para "Todos"
  })

  it("remove o prefixo 'aplicacao-exemplo-' no label", () => {
    render(<ServiceSelector services={["aplicacao-exemplo-api"]} value="" onChange={vi.fn()} />)

    expect(screen.getByText("api")).toBeInTheDocument()
  })

  it("remove o prefixo 'demo-' no label", () => {
    render(<ServiceSelector services={["demo-service"]} value="" onChange={vi.fn()} />)

    expect(screen.getByText("service")).toBeInTheDocument()
  })

  it("chama onChange com id vazio ao clicar em 'Todos'", async () => {
    const onChange = vi.fn()
    render(<ServiceSelector services={services} value="aplication-exemple-api" onChange={onChange} />)

    await userEvent.click(screen.getByText("Todos"))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("chama onChange com o serviço correto ao clicar", async () => {
    const onChange = vi.fn()
    render(<ServiceSelector services={services} value="" onChange={onChange} />)

    // shortName remove "aplication-exemple-" → exibe "api"
    await userEvent.click(screen.getByRole("button", { name: "api" }))

    expect(onChange).toHaveBeenCalledWith("aplication-exemple-api")
  })

  it("aplica estilo ativo no serviço selecionado", () => {
    render(
      <ServiceSelector services={services} value="aplication-exemple-api" onChange={vi.fn()} />
    )

    const activeBtn = screen.getByRole("button", { name: "api" })
    expect(activeBtn.className).toContain("bg-background")
  })

  it("aplica estilo ativo em 'Todos' quando value é vazio", () => {
    render(<ServiceSelector services={services} value="" onChange={vi.fn()} />)

    const todosBtn = screen.getByText("Todos")
    expect(todosBtn.className).toContain("bg-background")
  })
})
