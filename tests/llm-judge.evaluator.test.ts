import { describe, expect, test } from "bun:test";
import { createLLMJudgeEvaluator } from "../src/evals/evaluators";
import type { TaskRunner } from "../src/core/types";
import type { AIPromptInput, AIResponseOutput } from "../src/runners/ai.runner";

describe("LLM-as-a-Judge Evaluator", () => {
  test("debe aprobar cuando el Juez devuelve un score superior al umbral", async () => {
    const mockJudgeRunner: TaskRunner<AIPromptInput, AIResponseOutput> = {
      name: "Mock Judge",
      async execute() {
        return {
          text: JSON.stringify({
            score: 0.95,
            passed: true,
            reason: "La explicación técnica es clara y precisa.",
          }),
        };
      },
    };

    const judgeEvaluator = createLLMJudgeEvaluator({
      criteria: "La respuesta debe ser clara y técnicamente correcta.",
      judgeRunner: mockJudgeRunner,
      minPassingScore: 0.8,
    });

    const result = await judgeEvaluator(
      "Explicación de prueba sobre TypeScript",
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBe(0.95);
    expect(result.reason).toContain(
      "La explicación técnica es clara y precisa",
    );
  });

  test("debe reprobar cuando el Juez asigna una puntuación inferior al umbral mínimo", async () => {
    const mockJudgeRunner: TaskRunner<AIPromptInput, AIResponseOutput> = {
      name: "Mock Strict Judge",
      async execute() {
        return {
          text: JSON.stringify({
            score: 0.4,
            passed: false,
            reason:
              "La respuesta es vaga y carece de detalles de arquitectura.",
          }),
        };
      },
    };

    const judgeEvaluator = createLLMJudgeEvaluator({
      criteria: "Debe dar detalles profundos de arquitectura.",
      judgeRunner: mockJudgeRunner,
      minPassingScore: 0.7,
    });

    const result = await judgeEvaluator(
      "Es una herramienta para hacer páginas web.",
    );

    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.4);
    expect(result.reason).toContain("La respuesta es vaga");
  });
});
