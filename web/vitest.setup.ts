import "@testing-library/jest-dom"
import { vi } from "vitest"

// Env vars required by server action modules
process.env.OPENSEARCH_URL = "http://localhost:9200"
process.env.API_URL = "http://localhost:8082"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))
