import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { RefreshCountdown } from "@/app/dashboard/_components/refresh-countdown"

describe("RefreshCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("exibe o tempo inicial corretamente", () => {
    render(<RefreshCountdown interval={30} onRefresh={vi.fn()} />)

    expect(screen.getByText("30s")).toBeInTheDocument()
  })

  it("exibe formato com minutos para intervalos >= 60s", () => {
    render(<RefreshCountdown interval={60} onRefresh={vi.fn()} />)

    expect(screen.getByText("1min")).toBeInTheDocument()
  })

  it("exibe formato 'Xm Ys' quando há segundos restantes além dos minutos", () => {
    render(<RefreshCountdown interval={90} onRefresh={vi.fn()} />)

    expect(screen.getByText("1m 30s")).toBeInTheDocument()
  })

  it("decrementa o contador após 1 segundo", () => {
    render(<RefreshCountdown interval={30} onRefresh={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText("29s")).toBeInTheDocument()
  })

  it("chama onRefresh quando o contador chega a zero", () => {
    const onRefresh = vi.fn()
    render(<RefreshCountdown interval={10} onRefresh={onRefresh} />)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("reinicia o contador após chamar onRefresh", () => {
    const onRefresh = vi.fn()
    render(<RefreshCountdown interval={10} onRefresh={onRefresh} />)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByText("10s")).toBeInTheDocument()
  })

  it("aplica classe de alerta quando faltam 5s ou menos", () => {
    render(<RefreshCountdown interval={10} onRefresh={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    const span = screen.getByText(/Próxima atualização/).closest("span")
    expect(span?.className).toContain("text-amber-500")
  })

  it("reinicia o contador quando a prop interval muda", () => {
    const { rerender } = render(<RefreshCountdown interval={30} onRefresh={vi.fn()} />)

    rerender(<RefreshCountdown interval={60} onRefresh={vi.fn()} />)

    expect(screen.getByText("1min")).toBeInTheDocument()
  })
})
