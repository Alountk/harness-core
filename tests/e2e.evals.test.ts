import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  HarnessEngine,
  AIRunner,
  createContainsEvaluator,
  createJsonSchemaEvaluator,
  MarkdownReporter,
} from "../src/index";

describe("End-to-End AI Evaluation Suite", () => {
  test("should execute AI suite, run evaluators and produce Markdown report", async () => {
    // Expected schema for structured AI responses
    const HeroSchema = z.object({
      heroName: z.string(),
      powerLevel: z.number(),
    });

    const mockAiFetch: typeof fetch = async (url) => {
      // Simulate dynamic responses based on the request
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  heroName: "TypeScript Man",
                  powerLevel: 9000,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const runner = new AIRunner({
      config: { apiKey: "mock-key", fetchFn: mockAiFetch },
    });

    const engine = new HarnessEngine(runner, { concurrency: 2 });

    const suite = [
      {
        case: {
          id: "EVAL-001",
          name: "JSON Hero Schema Test",
          timeoutMs: 1000,
        },
        input: { prompt: "Generate hero JSON" },
        evaluator: createJsonSchemaEvaluator(HeroSchema),
      },
      {
        case: { id: "EVAL-002", name: "Keywords Test", timeoutMs: 1000 },
        input: { prompt: "Tell me about TypeScript" },
        evaluator: createContainsEvaluator({ includes: ["TypeScript"] }),
      },
    ];

    const results = await engine.runSuite(suite);

    expect(results.length).toBe(2);
    expect(results[0].status).toBe("PASSED");
    expect(results[0].evalResult?.passed).toBe(true);

    // Verify that the Markdown report is generated correctly
    const markdownReport = MarkdownReporter.generateReport(
      results,
      "AI Heroes Evaluation",
    );
    expect(markdownReport).toContain("# 📊 AI Heroes Evaluation");
    expect(markdownReport).toContain("`EVAL-001`");
    expect(markdownReport).toContain("✅ PASSED");
  });
});
