import { createCodeSyntaxEvaluator } from "../evals/evaluators";
import type { AIProviderAdapter } from "../runners/ai/providers";

export interface AgentTaskOptions {
  goal: string;
  maxIterations?: number;
  loader?: "ts" | "js" | "jsx" | "tsx";
}

export interface AgentExecutionResult {
  success: boolean;
  finalCode: string;
  iterations: number;
  history: Array<{ iteration: number; output: string; error?: string }>;
}

export class CodeAgent {
  private adapter: AIProviderAdapter;

  constructor(adapter: AIProviderAdapter) {
    this.adapter = adapter;
  }

  async run(options: AgentTaskOptions): Promise<AgentExecutionResult> {
    const maxIterations = options.maxIterations ?? 3;
    const loader = options.loader ?? "ts";
    const syntaxEvaluator = createCodeSyntaxEvaluator({ loader });

    let currentPrompt = options.goal;
    let history: Array<{ iteration: number; output: string; error?: string }> =
      [];
    let finalCode = "";
    let success = false;

    for (let i = 1; i <= maxIterations; i++) {
      console.log(
        `\n🤖 [Agent Iteration ${i}/${maxIterations}] Generating code...`,
      );

      const response = await this.adapter.generateResponse({
        systemPrompt:
          "You are an autonomous coding agent. Write clean, correct code fulfilling the user's objective. Always wrap your code inside markdown code blocks.",
        prompt: currentPrompt,
        temperature: 0.2,
      });

      const rawText = response.text;
      history.push({ iteration: i, output: rawText });

      const evalResult = await syntaxEvaluator(rawText);

      if (evalResult.passed) {
        console.log(
          `✅ [Agent Iteration ${i}] Syntax check passed successfully!`,
        );
        finalCode = rawText;
        success = true;
        break;
      } else {
        console.warn(
          `⚠️ [Agent Iteration ${i}] Syntax error found: ${evalResult.reason}`,
        );
        // Retroalimentar al modelo con el error de sintaxis para que lo corrija en la siguiente iteración
        currentPrompt = `The previous code you generated had a syntax error:\nError: ${evalResult.reason}\n\nPlease fix the code and return a corrected version fulfilling the original goal: ${options.goal}`;
      }
    }
    return { success, finalCode, iterations: history.length, history };
  }
}
