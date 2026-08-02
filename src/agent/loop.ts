import * as fs from "node:fs/promises";
import { createCodeSyntaxEvaluator } from "../evals/evaluators";
import type { AIProviderAdapter } from "../runners/ai/providers";
import { cleanMarkdownCode } from "./utils";
import { AgentHistory } from "./history";

export interface AgentTaskOptions {
  goal: string;
  maxIterations?: number;
  loader?: "ts" | "js" | "jsx" | "tsx";
  outputPath?: string;
  systemPrompt?: string;
}

export interface AgentExecutionResult {
  success: boolean;
  finalCode: string;
  iterations: number;
  history: Array<{ iteration: number; output: string; error?: string }>;
}

export class CodeAgent {
  private adapter: AIProviderAdapter;
  private history: AgentHistory;

  constructor(adapter: AIProviderAdapter, systemPrompt?: string) {
    this.adapter = adapter;
    this.history = new AgentHistory(
      systemPrompt ??
        "You are an autonomous coding agent. Write clean, correct code fulfilling the user's objective.",
    );
  }

  async run(options: AgentTaskOptions): Promise<AgentExecutionResult> {
    const maxIterations = options.maxIterations ?? 3;
    const loader = options.loader ?? "ts";
    const syntaxEvaluator = createCodeSyntaxEvaluator({ loader });

    // let currentPrompt = options.goal;
    // let history: Array<{ iteration: number; output: string; error?: string }> =
    // [];
    this.history.addUserMessage(options.goal);
    let success = false;
    let finalCode = "";
    let iterations = 0;

    for (let i = 1; i <= maxIterations; i++) {
      iterations = i;
      console.log(
        `\n🤖 [Agent Iteration ${i}/${maxIterations}] Calling AI with history...`,
      );

      const response = await this.adapter.generateResponse({
        systemPrompt: this.history.getMessages()[0].content,
        prompt: this.history
          .getMessages()
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n"),
        temperature: 0.2,
      });

      const rawText = response.text;
      //   history.push({ iteration: i, output: rawText });
      this.history.addAssistantMessage(rawText);

      const evalResult = await syntaxEvaluator(rawText);

      if (evalResult.passed) {
        console.log(`✅ [Agent] Syntax check passed!`);
        finalCode = cleanMarkdownCode(rawText);
        success = true;

        if (options.outputPath) {
          await fs.writeFile(options.outputPath, finalCode, "utf-8");
          console.log(`📁 [Agent] Saved to ${options.outputPath}`);
        }
        break;
      } else {
        console.warn(
          `⚠️ [Agent] Syntax error: ${evalResult.reason}. Retrying with feedback...`,
        );
        const feedback = `The previous code had a syntax error: ${evalResult.reason}. Please fix it.`;
        this.history.addUserMessage(feedback);
      }
    }

    return {
      success,
      finalCode,
      iterations,
      history: this.history.getMessages(),
    };
  }
}
