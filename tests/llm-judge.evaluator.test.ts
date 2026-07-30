import { describe, expect, test } from "bun:test";
import { createLLMJudgeEvaluator } from "../src/evals/evaluators";
import type { TaskRunner } from "../src/core/types";
import type { AIPromptInput, AIResponseOutput } from "../src/runners/ai.runner";

describe("LLM-as-a-Judge Evaluator", () => {
  test("should pass when the judge returns a score above the threshold", async () => {
    const mockJudgeRunner: TaskRunner<AIPromptInput, AIResponseOutput> = {
      name: "Mock Judge",
      async execute() {
        return {
          text: JSON.stringify({
            score: 0.95,
            passed: true,
            reason: "The technical explanation is clear and precise.",
          }),
        };
      },
    };

    const judgeEvaluator = createLLMJudgeEvaluator({
      criteria: "The response must be clear and technically correct.",
      judgeRunner: mockJudgeRunner,
      minPassingScore: 0.8,
    });

    const result = await judgeEvaluator(
      "Test explanation about TypeScript",
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBe(0.95);
    expect(result.reason).toContain(
      "The technical explanation is clear and precise",
    );
  });

  test("should fail when the judge assigns a score below the minimum threshold", async () => {
    const mockJudgeRunner: TaskRunner<AIPromptInput, AIResponseOutput> = {
      name: "Mock Strict Judge",
      async execute() {
        return {
          text: JSON.stringify({
            score: 0.4,
            passed: false,
            reason:
              "The response is vague and lacks architectural details.",
          }),
        };
      },
    };

    const judgeEvaluator = createLLMJudgeEvaluator({
      criteria: "It must provide deep architectural details.",
      judgeRunner: mockJudgeRunner,
      minPassingScore: 0.7,
    });

    const result = await judgeEvaluator(
      "It is a tool for building web pages.",
    );

    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.4);
    expect(result.reason).toContain("The response is vague");
  });
});
