import * as fs from "node:fs/promises";
import { createCodeSyntaxEvaluator } from "../evals/evaluators";
import type { AIProviderAdapter } from "../runners/ai/providers";
import { cleanMarkdownCode } from "./utils";
import { AgentHistory } from "./history";
import { runCodeTests } from "./test-runner";
import { readWorkspaceFile } from "./workspace";
import { writeWorkspaceFile } from "./tools/file-writter";
import { parseToolCall } from "./tools/parser";

export interface AgentTaskOptions {
  goal: string;
  maxIterations?: number;
  loader?: "ts" | "js" | "jsx" | "tsx";
  outputPath?: string;
  testPath?: string;
  contextFiles?: string[];
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

    let contextualGoal = options.goal;
    if (options.contextFiles && options.contextFiles.length > 0) {
      let fileContexts = "\n\nExisting Workspace Context:\n";
      for (const filePath of options.contextFiles) {
        const content = await readWorkspaceFile(filePath);
        fileContexts += `--- File: ${filePath} ---\n${content}\n\n`;
      }
      contextualGoal += fileContexts;
    }

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
        systemPrompt: this.history.getMessages()[0]?.content,
        prompt: this.history
          .getMessages()
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n"),
        temperature: 0.2,
      });

      const rawText = response.text;
      this.history.addAssistantMessage(rawText);

      const toolCall = parseToolCall(rawText);
      if (toolCall && toolCall.tool === "writeWorkspaceFile") {
        console.log(
          `🛠️ [Agent] Executing tool: writeWorkspaceFile on ${toolCall.args.filePath}`,
        );
        const toolResult = await writeWorkspaceFile(
          toolCall.args.filePath,
          toolCall.args.content,
        );

        if (!toolResult.success) {
          this.history.addUserMessage(
            `Tool execution failed: ${toolResult.message}. Please try again.`,
          );
          continue;
        }

        // Si especificaron un outputPath por CLI y coincide o queremos usarlo
        finalCode = toolCall.args.content;
      } else {
        // Fallback al comportamiento clásico por si devuelve código plano en markdown
        const evalResult = await syntaxEvaluator(rawText);

        if (!evalResult.passed) {
          console.warn(
            `⚠️ [Agent] Syntax error: ${evalResult.reason}. Retrying...`,
          );
          this.history.addUserMessage(
            `The previous code had a syntax error: ${evalResult.reason}. Please fix it.`,
          );
          continue;
        }

        console.log(`✅ [Agent] Syntax check passed!`);
        const cleanedCode = cleanMarkdownCode(rawText);

        if (options.outputPath) {
          await writeWorkspaceFile(options.outputPath, cleanedCode);
          finalCode = cleanedCode;
        }
      }

      // 2. Validación de tests unitarios
      if (options.testPath) {
        console.log(`🧪 [Agent] Running unit tests on ${options.testPath}...`);
        const testResult = await runCodeTests(options.testPath);

        if (!testResult.passed) {
          console.warn(`❌ [Agent] Tests failed: ${testResult.reason}`);
          this.history.addUserMessage(
            `The code passed syntax check, but failed the unit tests:\n${testResult.reason}\n\nPlease fix the implementation to make the tests pass.`,
          );
          continue;
        }
        console.log(`🎉 [Agent] All unit tests passed successfully!`);
      }

      success = true;
      break;
    }

    return {
      success,
      finalCode,
      iterations,
      history: this.history.getMessages(),
    };
  }
}
