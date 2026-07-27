import { describe, expect, test } from "bun:test";
import { HarnessEngine, AIRunner, GoogleAIStudioAdapter } from "../src/index";

describe("Multi-Provider AI Runner", () => {
  test("OpenAI Adapter should format request and process output", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Response from OpenAI" } }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const runner = new AIRunner({
      provider: "openai",
      config: { apiKey: "mock-key", fetchFn: mockFetch },
    });

    const engine = new HarnessEngine(runner);

    const result = await engine.runTest(
      { id: "OPENAI-001", name: "OpenAI Test", timeoutMs: 1000 },
      { prompt: "Hello OpenAI" },
    );

    expect(result.status).toBe("PASSED");
  });

  test("Gemini Adapter should parse Gemini API payload format", async () => {
    const mockGeminiFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Response from Google Gemini" }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 15,
            totalTokenCount: 27,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const geminiAdapter = new GoogleAIStudioAdapter({
      apiKey: "mock-gemini-key",
      fetchFn: mockGeminiFetch,
    });

    const runner = new AIRunner({ adapter: geminiAdapter });
    const engine = new HarnessEngine(runner);

    const result = await engine.runTest(
      { id: "GEMINI-001", name: "Gemini Test", timeoutMs: 1000 },
      { prompt: "Hello Gemini" },
    );

    expect(result.status).toBe("PASSED");
  });
});
