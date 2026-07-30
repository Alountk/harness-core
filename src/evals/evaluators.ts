import { z } from "zod";
import type { AIPromptInput, AIResponseOutput } from "../runners/ai.runner";
import type { TaskRunner } from "../core/types";

export interface EvalResult {
  passed: boolean;
  score?: number; // Optional score for the evaluation, if applicable
  reason?: string;
  details?: unknown; // Optional additional details about the evaluation result
}

export type Evaluator = (
  output: AIResponseOutput,
  signal?: AbortSignal
) => Promise<EvalResult> | EvalResult;

/**
 * A simple evaluator that checks whether the AI response contains a specific keyword.
 */

export function createContainsEvaluator(options: {
  includes?: string[];
  excludes?: string[];
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

export interface LLMJudgeOptions {
  criteria: string; // Criteria or rubric for judging the AI response
  judgeRunner: TaskRunner<AIPromptInput, AIResponseOutput>; // Runner used to evaluate the AI response
  minPassingScore?: number; // Optional minimum score to consider the evaluation as passed
}

const JudgeSchema = z.object({
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  reason: z.string(),
});

/**
 * Evaluator "LLM-as-a-Judge": use a language model for evaluation.
 * This evaluator sends the AI response to another LLM (the judge) together with the evaluation criteria, and expects a structured response indicating whether the original response passed the evaluation.
 */

export function createLLMJudgeEvaluator(
  options: LLMJudgeOptions,
): Evaluator {
  const minScore = options.minPassingScore ?? 0.7;

  return async (output: unknown, signal?: AbortSignal): Promise<EvalResult> => {
    const textToEvaluate =
      typeof output === "string" ? output : JSON.stringify(output ?? "");

    const systemPrompt = `You are an impartial and rigorous judge expert in evaluating responses from Language Models (LLMs).
                          Your objective is to analyze the response provided by a model and evaluate it according to the specified criterion.
                          You must respond ONLY with a valid JSON object using the following structure:
                          {
                            "score": <number between 0.0 and 1.0>,
                            "passed": <true/false boolean>,
                            "reason": "<detailed and well-justified explanation of the verdict>"
                          }`;
    const prompt = `EVALUATION CRITERIA:
                    ${options.criteria}

                    MODEL RESPONSE TO EVALUATE:
                    """
                    ${textToEvaluate}
                    """

                    Evaluate the response according to the criterion and return the corresponding JSON object.`;
    try {
      const judgeResponse = await options.judgeRunner.execute({
        systemPrompt,
        prompt,
        temperature: 0.1, // Low temperature for deterministic output
      }, signal);

      let rawResponse = judgeResponse.text.trim();
      if (rawResponse.startsWith("```json")) {
        rawResponse = rawResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (rawResponse.startsWith("```")) {
        rawResponse = rawResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(rawResponse);
      const validated = JudgeSchema.parse(parsed);

      const isPassed = validated.passed && validated.score >= minScore;

      return {
        score: validated.score,
        passed: isPassed,
        reason: `[LLM-Judge]: ${validated.reason} (Score: ${validated.score}/${minScore})`,
        details: validated,
      };
    } catch (error) {
      return {
        score: 0,
        passed: false,
        reason: `Error while running the LLM-Judge evaluation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
}
