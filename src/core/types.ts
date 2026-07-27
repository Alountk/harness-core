// src/core/types.ts
import { z } from "zod";

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  timeoutMs: z.number().default(5000), // Timeout for the test case in milliseconds
  retries: z.number().default(0), // Number of retries for the test case
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export interface TestResult {
  testId: string;
  status: "PASSED" | "FAILED" | "TIMEOUT" | "SKIPPED";
  durationMs: number;
  attempts?: number; // Number of attempts made for this test case ( 1 = without retries)
  error?: Error;
  metrics?: Record<string, number | string>;
  logs?: string[];
}

export interface TaskRunner<TInput = unknown, TOutput = unknown> {
  name: string;
  setup?: () => Promise<void>;
  execute: (input: TInput, signal: AbortSignal) => Promise<TOutput>; // Receives an AbortSignal to handle cancellation
  teardown?: () => Promise<void>;
}
