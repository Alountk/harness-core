import type { AIPromptInput, AIResponseOutput } from "../ai.runner";

export interface AIProviderAdapter {
  name: string;
  generateResponse(
    input: AIPromptInput,
    signal?: AbortSignal,
  ): Promise<AIResponseOutput>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fetchFn?: typeof fetch;
}

/**
 * Adapter for OpenAI API. This class implements the AIProviderAdapter interface and provides a method to generate responses from the OpenAI API.
 */

export class OpenAIAdapter implements AIProviderAdapter {
  name = "OpenAI Provider";
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private fetchFn: typeof fetch;

  constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
    this.defaultModel = config.defaultModel || "gpt-4o-mini";
    this.fetchFn = config.fetchFn || fetch;
  }

  async generateResponse(
    input: AIPromptInput,
    signal?: AbortSignal,
  ): Promise<AIResponseOutput> {
    const model = input.model || this.defaultModel;
    const messages = [];

    if (input.systemPrompt) {
      messages.push({ role: "system", content: input.systemPrompt });
    }
    messages.push({ role: "user", content: input.prompt });

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
      signal, // Connect AbortSignal for cancellation/timeouts
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI Request failed with status ${response.status}: ${errorText}`,
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
    if (!choice) {
      throw new Error("OpenAI response contained no choices.");
    }

    return {
      text: choice.message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
      raw: data, // Include the raw response for debugging or further processing
    };
  }
}

/**
 * Adapter for Google AI Studio API. This class implements the AIProviderAdapter interface and provides a method to generate responses from the Google AI API.
 */

export class GoogleAIStudioAdapter implements AIProviderAdapter {
  name = "Google AI Studio Provider";
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private fetchFn: typeof fetch;

  constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY || "";
    this.baseUrl =
      config.baseUrl || "https://api.generativelanguage.googleapis.com/v1beta2";
    this.defaultModel =
      config.defaultModel || "gemini-2.5-flash-preview-09-2025";
    this.fetchFn = config.fetchFn || fetch;
  }

  async generateResponse(
    input: AIPromptInput,
    signal?: AbortSignal,
  ): Promise<AIResponseOutput> {
    const model = input.model || this.defaultModel;
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    const contents = [{ parts: [{ text: input.prompt }] }];
    const systemInstruction = input.systemPrompt
      ? [{ parts: [{ text: input.systemPrompt }] }]
      : undefined;

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: input.temperature ?? 0.7,
        },
      }),
      signal, // Connect AbortSignal for cancellation/timeouts
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google AI Request failed with status ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        outputTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return {
      text: candidateText,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.outputTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined, // Google AI Studio may not provide detailed usage metrics
      raw: data, // Include the raw response for debugging or further processing
    };
  }
}
