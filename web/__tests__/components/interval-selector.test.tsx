import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntervalSelector } from "@/app/dashboard/_components/interval-selector"

describe("IntervalSelector", () => {
  it("exibe todas as opções de intervalo", () => {
    render(<IntervalSelector value={10} onChange={vi.fn()} />)

    expect(screen.getByText("10s")).toBeInTheDocument()
    expect(screen.getByText("30s")).toBeInTheDocument()
    expect(screen.getByText("1min")).toBeInTheDocument()
    expect(screen.getByText("5min")).toBeInTheDocument()
  })

  it("aplica estilo ativo na opção selecionada", () => {
    render(<IntervalSelector value={30} onChange={vi.fn()} />)

    const activeBtn = screen.getByText("30s")
    expect(activeBtn.className).toContain("bg-primary")
  })

  it("não aplica estilo ativo nas opções não selecionadas", () => {
    render(<IntervalSelector value={30} onChange={vi.fn()} />)

    const inactiveBtn = screen.getByText("10s")
    expect(inactiveBtn.className).not.toContain("bg-primary")
  })

  it("chama onChange com o valor correto ao clicar", async () => {
    const onChange = vi.fn()
    render(<IntervalSelector value={10} onChange={onChange} />)

    await userEvent.click(screen.getByText("5min"))

    expect(onChange).toHaveBeenCalledWith(300)
  })

  it("chama onChange ao clicar na opção já selecionada", async () => {
    const onChange = vi.fn()
    render(<IntervalSelector value={10} onChange={onChange} />)

    await userEvent.click(screen.getByText("10s"))

    expect(onChange).toHaveBeenCalledWith(10)
  })
})
