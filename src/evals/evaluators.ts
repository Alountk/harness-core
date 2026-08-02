import { z } from "zod";
import type { AIPromptInput, AIResponseOutput } from "../runners/ai.runner";
import type { TaskRunner } from "../core/types";

export interface EvalResult {
  passed: boolean;
  score?: number; // Optional score for the evaluation, if applicable
  reason?: string;
  details?: unknown; // Optional additional details about the evaluation result
}

// export type Evaluator = (
//   output: AIResponseOutput,
//   signal?: AbortSignal,
// ) => Promise<EvalResult> | EvalResult;

export type Evaluator<TOutput = unknown> = (
  output: TOutput,
  signal?: AbortSignal,
  executionMetadata?: {
    durationMs?: number;
    usage?: { totalTokens?: number; completionTokens?: number };
  },
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

export function createLLMJudgeEvaluator(options: LLMJudgeOptions): Evaluator {
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
      const judgeResponse = await options.judgeRunner.execute(
        {
          systemPrompt,
          prompt,
          temperature: 0.1, // Low temperature for deterministic output
        },
        signal,
      );

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

export function createCodeSyntaxEvaluator(
  options: {
    loader?: "ts" | "js" | "jsx" | "tsx";
  } = {},
): Evaluator {
  const loader = options.loader ?? "ts";

  return (output: unknown): EvalResult => {
    let rawText = "";

    if (typeof output === "string") {
      rawText = output;
    } else if (typeof output === "object" && output !== null) {
      const casted = output as { text?: string };
      rawText =
        typeof casted.text === "string" ? casted.text : JSON.stringify(output);
    }

    const firstBacktick = rawText.indexOf("```");
    let codeToValidate = rawText;

    if (firstBacktick !== -1) {
      const lastBacktick = rawText.lastIndexOf("```");
      if (lastBacktick > firstBacktick) {
        const extracted = rawText.substring(firstBacktick, lastBacktick);
        const firstNewLine = extracted.indexOf("\n");
        if (firstNewLine !== -1) {
          codeToValidate = extracted.substring(firstNewLine + 1).trim();
        }
      }
    }

    if (!codeToValidate) {
      return {
        score: 0,
        passed: false,
        reason:
          "No valid code block was found to evaluate syntactically.",
      };
    }

    try {
      const transpiler = new Bun.Transpiler({ loader });
      transpiler.transformSync(codeToValidate);

      return {
        score: 1,
        passed: true,
      };
    } catch (error) {
      return {
        score: 0,
        passed: false,
        reason:
          "Code Syntax Error (" +
          loader +
          "): " +
          (error instanceof Error ? error.message : String(error)),
      };
    }
  };
}

export interface LatencyEvaluatorOptions {
  maxDurationMs: number; // Maximum allowed duration in milliseconds
  minTokensPerSecond?: number; // Optional minimum tokens per second to consider the evaluation as passed
}

/**
 * Evaluator for latency and performance. It checks if the AI response was generated within a specified time limit and optionally checks the tokens per second rate.
 */

export function createLatencyEvaluator(
  options: LatencyEvaluatorOptions,
): Evaluator {
  return (
    output: unknown,
    signal?: AbortSignal,
    executionMetadata?: {
      durationMs?: number;
      usage?: { totalTokens?: number; completionTokens?: number };
    },
  ): EvalResult => {
    const durationMs = executionMetadata?.durationMs ?? 0;
    const tokens =
      executionMetadata?.usage?.completionTokens ||
      executionMetadata?.usage?.totalTokens ||
      0;

    if (
      options.maxDurationMs !== undefined &&
      durationMs > options.maxDurationMs
    ) {
      return {
        score: 0,
        passed: false,
        reason: `Response took too long: ${durationMs}ms (max allowed: ${options.maxDurationMs}ms)`,
      };
    }

    if (
      options.minTokensPerSecond !== undefined &&
      durationMs > 0 &&
      tokens > 0
    ) {
      const seconds = durationMs / 1000;
      const tokensPerSecond = tokens / seconds;

      if (tokensPerSecond < options.minTokensPerSecond) {
        return {
          score: tokensPerSecond / options.minTokensPerSecond,
          passed: false,
          reason: `Tokens per second too low: ${tokensPerSecond.toFixed(2)} (min required: ${options.minTokensPerSecond})`,
        };
      }
    }
    return {
      score: 1,
      passed: true,
      reason: `Response generated in ${durationMs}ms with ${tokens} tokens.`,
    };
  };
}
