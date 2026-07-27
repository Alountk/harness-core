// tests/ai.runner.test.ts
import { describe, expect, test } from "bun:test";
import { HarnessEngine, AIRunner } from "../src/index";

describe("AIRunner Integration", () => {
  test("should correctly process AI prompts and capture responses", async () => {
    // Simulación de respuesta de la API de IA
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          choices: [
            { message: { content: "Hello! How can I help you today?" } },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const aiRunner = new AIRunner({
      apiKey: "mock-key",
      fetchFn: mockFetch,
    });

    const engine = new HarnessEngine(aiRunner);

    const result = await engine.runTest(
      { id: "AI-001", name: "Basic AI Greeting Test", timeoutMs: 2000 },
      {
        systemPrompt: "You are a helpful assistant.",
        prompt: "Say hello",
      },
    );

    expect(result.status).toBe("PASSED");
    expect(result.attempts).toBe(1);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("should handle AI API errors gracefully and report failure", async () => {
    // Simulación de un error 500 de la API
    const mockFetch: typeof fetch = async () => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const aiRunner = new AIRunner({
      apiKey: "mock-key",
      fetchFn: mockFetch,
    });

    const engine = new HarnessEngine(aiRunner);

    const result = await engine.runTest(
      {
        id: "AI-002",
        name: "AI API Error Handling",
        timeoutMs: 1000,
        retries: 0,
      },
      { prompt: "Test fail" },
    );

    expect(result.status).toBe("FAILED");
    expect(result.error?.message).toContain(
      "AI Request failed with status 500",
    );
  });
});
