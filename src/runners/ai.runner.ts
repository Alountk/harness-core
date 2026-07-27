import type { TaskRunner } from "../core/types";
import {
  GoogleAIStudioAdapter,
  OpenAIAdapter,
  type AIProviderAdapter,
  type ProviderConfig,
} from "./ai/providers";

export interface AIPromptInput {
  systemPrompt?: string;
  prompt: string;
  temperature?: number; // Optional temperature parameter for the AI model
  model?: string; // Optional model parameter for the AI model
}

export interface AIResponseOutput {
  text: string; // The text response from the AI model
  usage?: {
    promptTokens: number; // Number of tokens used in the prompt
    completionTokens: number; // Number of tokens used in the completion
    totalTokens: number; // Total number of tokens used
  };
  raw?: unknown; // The raw response from the AI model
}

export type ProviderType = "openai" | "gemini" | "custom";

export interface AIRunnerOptions {
  provider?: ProviderType; // The AI provider to use (e.g., "openai", "gemini", or "custom")
  adapter?: AIProviderAdapter;
  config?: ProviderConfig; // Optional configuration for the AI provider
}

export class AIRunner implements TaskRunner<AIPromptInput, AIResponseOutput> {
  name = "AI Model Runner";
  private adapter: AIProviderAdapter;

  constructor(options: AIRunnerOptions = {}) {
    if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      switch (options.provider) {
        case "gemini":
          this.adapter = new GoogleAIStudioAdapter(options.config);
          break;
        case "openai":
        default:
          this.adapter = new OpenAIAdapter(options.config);
          break;
      }
    }
  }

  async execute(
    input: AIPromptInput,
    signal?: AbortSignal,
  ): Promise<AIResponseOutput> {
    return this.adapter.generateResponse(input, signal);
  }
}
