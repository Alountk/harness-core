import { describe, expect, test } from "bun:test";
import { HarnessEngine, AIRunner, LMStudioAdapter } from "../src/index";

describe("LM Studio Local Provider", () => {
  test("should format requests according to OpenAI compatible API and return parsed text", async () => {
    const mockFetch: typeof fetch = async (url) => {
      expect(url.toString()).toContain(
        "http://localhost:1234/v1/chat/completions",
      );

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: "Test response from Local LM Studio" },
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 10, total_tokens: 22 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const lmStudioAdapter = new LMStudioAdapter({
      baseUrl: "http://localhost:1234/v1",
      model: "mistral-7b-instruct",
      fetchFn: mockFetch,
    });

    const runner = new AIRunner({ adapter: lmStudioAdapter });
    const engine = new HarnessEngine(runner);

    const result = await engine.runTest(
      { id: "LMSTUDIO-001", name: "LM Studio Unit Test", timeoutMs: 1000 },
      { prompt: "Hello from the harness" },
    );

    expect(result.status).toBe("PASSED");
    expect(result.attempts).toBe(1);
  });
});
