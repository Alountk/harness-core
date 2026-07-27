// Exporting the core engine and its options
export { HarnessEngine } from "./core/engine";
export type { EngineOptions } from "./core/engine";

// Export the principal types used in the testing framework
export type { TestCase, TestResult, TaskRunner } from "./core/types";
export { TestCaseSchema } from "./core/types";

// Exporting the Schemes and fixture validation utilities
export { StandardFixtureSchema, validateFixture } from "./fixtures/fixture";
export type { StandardFixture } from "./fixtures/fixture";

// Exporting the Reporters, starting with the ConsoleReporter
export { ConsoleReporter } from "./reporters/console";

// Exporting the AI Runner and its associated types
export { AIRunner } from "./runners/ai.runner";
export type { AIPromptInput, AIResponseOutput, AIRunnerOptions } from "./runners/ai.runner";

// Exporting the Evaluators and their types
export { createContainsEvaluator, createJsonSchemaEvaluator } from "./evals/evaluators";
export type { EvalResult, Evaluator } from "./evals/evaluators";