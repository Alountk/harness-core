import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  createContainsEvaluator,
  createJsonSchemaEvaluator,
} from "../src/index";

describe("AI Evaluators (LLM Evals)", () => {
  test("ContainsEvaluator should correctly validate keyword rules", async () => {
    const evaluator = createContainsEvaluator({
      includes: ["typescript", "bun"],
      excludes: ["python"],
    });

    const validOutput = {
      text: "We are building a test harness in TypeScript using Bun.",
    };

    const result = await evaluator(validOutput);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);

    const invalidOutput = {
      text: "We are building a test harness in Python.",
    };

    const invalidResult = await evaluator(invalidOutput);
    expect(invalidResult.passed).toBe(false);
    expect(invalidResult.reason).toContain('missing required keyword: "typescript"');
  });

  test("JsonSchemaEvaluator should validate structured JSON AI outputs", async () => {
    const UserSummarySchema = z.object({
      name: z.string(),
      role: z.string(),
      experienceYears: z.number(),
    });

    const evaluator = createJsonSchemaEvaluator(UserSummarySchema);

    // Cadena JSON válida formateada limpiamente sin comillas invertidas conflictivas
    const jsonPayload = JSON.stringify({
      name: "Raúl",
      role: "Senior React Developer",
      experienceYears: 5,
    });

    const mockAiResponse = {
      text: "```json\n" + jsonPayload + "\n```",
    };

    const result = await evaluator(mockAiResponse);
    expect(result.passed).toBe(true);

    // Respuesta JSON inválida (falta el campo experienceYears)
    const badAiResponse = {
      text: '{"name": "Raúl", "role": "Senior React Developer"}',
    };

    const badResult = await evaluator(badAiResponse);
    expect(badResult.passed).toBe(false);
    expect(badResult.reason).toContain("JSON Schema Mismatch");
  });
});