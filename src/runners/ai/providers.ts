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
      config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    this.defaultModel =
      config.defaultModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
      ? { role: "system", parts: [{ text: input.systemPrompt }] }
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

/**
 * Adapter for Local AI Providers. This class implements the AIProviderAdapter interface and provides a method to generate responses from a local AI model.
 * Note: This is a placeholder implementation. Actual integration with local AI models will depend on the specific model and its API.
 */

export class OllamaAdapter implements AIProviderAdapter {
  name = "Ollama Local AI Provider";
  private baseUrl: string;
  private defaultModel: string;
  private fetchFn: typeof fetch;

  constructor(config: ProviderConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.LOCAL_AI_BASE_URL ||
      "http://111.111.111.30:1234"; // Default local server URL
    this.defaultModel =
      config.defaultModel || process.env.OLLAMA_AI_MODEL || "llama3.2";
    this.fetchFn = config.fetchFn || fetch;
  }

  async generateResponse(
    input: AIPromptInput,
    signal?: AbortSignal,
  ): Promise<AIResponseOutput> {
    const model = input.model || this.defaultModel;
    const url = `${this.baseUrl}/api/generate`;

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        system: input.systemPrompt,
        stream: false, // Assuming we want a complete response rather than streaming
        options: {
          temperature: input.temperature ?? 0.7,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Local AI Request failed with status ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      response: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      text: data.response,
      usage:
        data.prompt_eval_count !== undefined && data.eval_count !== undefined
          ? {
              promptTokens: data.prompt_eval_count,
              completionTokens: data.eval_count,
              totalTokens: data.prompt_eval_count + data.eval_count,
            }
          : undefined,
      raw: data,
    };
  }
}

/**
 * Adapter for LM Studio Local Provider. This class extends the OpenAIAdapter and overrides the base URL and default model to point to a local LM Studio instance.
 * Note: Ensure that the LM Studio server is running and accessible at the specified URL.
 */
export class LMStudioAdapter extends OpenAIAdapter {
  override name = "LM Studio Local Provider";

  constructor(config: ProviderConfig = {}) {
    super({
      ...config,
      baseUrl:
        config.baseUrl ||
        process.env.LM_STUDIO_URL ||
        "http://111.111.111.30:1234/v1",
      defaultModel: config.defaultModel || "local-model",
      apiKey: config.apiKey || process.env.LM_STUDIO_API_KEY || "",
    });
  }
}
