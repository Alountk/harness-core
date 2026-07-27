import { z } from "zod";
import type { AIResponseOutput } from "../runners/ai.runner";

export interface EvalResult {
  passed: boolean;
  score?: number; // Optional score for the evaluation, if applicable
  reason?: string;
}

export type Evaluator = (
  output: AIResponseOutput,
) => Promise<EvalResult> | EvalResult;

/**
 * A simple evaluator that checks if the AI response contains a specific keyword.
 */

export function createContainsEvaluator(options: {
  includes?: string;
  excludes?: string;
}): Evaluator {
  return (output) => {
    const text = output.text;

    if (options.includes) {
      for (const word of options.includes) {
        if (!text.toLowerCase().includes(word.toLowerCase())) {
          return {
            passed: false,
            score: 0,
            reason: `Response missing required keyword: "${word}"`,
          };
        }
      }
    }

    if (options.excludes) {
      for (const word of options.excludes) {
        if (text.toLowerCase().includes(word.toLowerCase())) {
          return {
            passed: false,
            score: 0,
            reason: `Response contains forbidden keyword: "${word}"`,
          };
        }
      }
    }

    return { passed: true, score: 1 };
  };
}

/**
 * Evaluator for JSON Schema. It uses Zod to validate the AI response against a provided schema.
 */

export function createJsonSchemaEvaluator<T>(
  schema: z.ZodSchema<T>,
): Evaluator {
  return (output) => {
    try {
      // Try to extract the JSON block even if the model wrapped it in Markdown ```json ... ```
      const cleanedText = output.text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsedJson = JSON.parse(cleanedText);
      const validation = schema.safeParse(parsedJson);

      if (!validation.success) {
        return {
          passed: false,
          score: 0,
          reason: `JSON Schema Mismatch: ${validation.error.message}`,
        };
      }

      return { passed: true, score: 1 };
    } catch (err) {
      return {
        passed: false,
        score: 0,
        reason: `Failed to parse AI output as JSON: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  };
}
