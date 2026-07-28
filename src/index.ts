// Core Engine
export { HarnessEngine } from "./core/engine";
export type { EngineOptions } from "./core/engine";

// Core Types
export type { TestCase, TestResult, TaskRunner } from "./core/types";
export { TestCaseSchema } from "./core/types";

// Fixtures
export { StandardFixtureSchema, validateFixture } from "./fixtures/fixture";
export type { StandardFixture } from "./fixtures/fixture";

// Reporters
export { ConsoleReporter } from "./reporters/console";
export { MarkdownReporter } from "./reporters/markdown";

// AI Runners & Providers
export { AIRunner } from "./runners/ai.runner";
export type {
  AIPromptInput,
  AIResponseOutput,
  AIRunnerOptions,
  ProviderType,
} from "./runners/ai.runner";
export { OpenAIAdapter, GoogleAIStudioAdapter, OllamaAdapter, LMStudioAdapter } from "./runners/ai/providers";
export type { AIProviderAdapter, ProviderConfig } from "./runners/ai/providers";

// Evaluators
export {
  createContainsEvaluator,
  createJsonSchemaEvaluator,
} from "./evals/evaluators";
export type { EvalResult, Evaluator } from "./evals/evaluators";