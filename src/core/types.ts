// src/core/types.ts
import { z } from "zod";

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  timeoutMs: z.number().default(5000),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export interface TestResult {
  testId: string;
  status: "PASSED" | "FAILED" | "TIMEOUT" | "SKIPPED";
  durationMs: number;
  error?: Error;
  metrics?: Record<string, number | string>;
  logs?: string[];
}

export interface TaskRunner<TInput = unknown, TOutput = unknown> {
  name: string;
  setup?: () => Promise<void>;
  execute: (input: TInput) => Promise<TOutput>;
  teardown?: () => Promise<void>;
}
