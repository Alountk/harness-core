import type { TaskRunner } from "../core/types";

export interface AIPromptInput {
  systemPrompt: string;
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
  raw: any; // The raw response from the AI model
}

export interface AIRunnerOptions {
  apiKey?: string; // API key for the AI
  baseUrl?: string; // Base URL for the AI API
  defaultModel?: string; // Default model to use if not specified in the input
  // Allow injecting a custom fetch function for testing or mocking purposes. If not provided, the global fetch will be used.
  fetchFn?: typeof fetch;
}

export class AIRunner implements TaskRunner<AIPromptInput, AIResponseOutput> {
  name = "AI Model Runner";
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private fetchFn: typeof fetch;

  constructor(options: AIRunnerOptions = {}) {
    this.apiKey = options.apiKey || process.env.AI_API_KEY || "";
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
    this.defaultModel = options.defaultModel || "gpt-4o-mini";
    this.fetchFn = options.fetchFn || fetch;
  }

  async execute(
    input: AIPromptInput,
    signal?: AbortSignal,
  ): Promise<AIResponseOutput> {
    const model = input.model || this.defaultModel;

    const messages = [];
    if (input.systemPrompt) {
      messages.push({ role: "system", content: input.systemPrompt });
    }
    messages.push({ role: "user", content: input.prompt });

    // Make the API request to the AI model
    const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: input.temperature ?? 0.7,
      }),
      signal, // Connect AbortSignal from the HarnessEngine for cancellation/timeouts
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AI Request failed with status ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const choice = data.choices?.[0];
    if (!choice) throw new Error("AI Response did not contain any choices.");

    return {
      text: choice.message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      raw: data,
    };
  }
}
