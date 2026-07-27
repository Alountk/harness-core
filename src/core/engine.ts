// src/core/engine.ts
import type { TaskRunner, TestCase, TestResult } from "./types";
import { mapConcurrent } from "../utils/concurrency";

export interface EngineOptions {
  concurrency?: number; // Optional concurrency limit for running tests
}

export class HarnessEngine<TInput, TOutput> {
  private runner: TaskRunner<TInput, TOutput>;
  private concurrency: number;

  constructor(runner: TaskRunner<TInput, TOutput>, options?: EngineOptions) {
    this.runner = runner;
    this.concurrency = options?.concurrency ?? 1; // Default to 1 if not provided
  }

  async runTest(testCase: TestCase, input: TInput): Promise<TestResult> {
    const startTime = performance.now();
    const logs: string[] = [];

    try {
      if (this.runner.setup) {
        await this.runner.setup();
      }

      await this.runner.execute(input);

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      return {
        testId: testCase.id,
        status: "PASSED",
        durationMs,
        logs,
      };
    } catch (error) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      return {
        testId: testCase.id,
        status: "FAILED",
        durationMs,
        error: error instanceof Error ? error : new Error(String(error)),
        logs,
      };
    } finally {
      if (this.runner.teardown) {
        await this.runner.teardown();
      }
    }
  }

  async runSuite(
    testSuite: Array<{ case: TestCase; input: TInput }>,
  ): Promise<TestResult[]> {
    return mapConcurrent(testSuite, this.concurrency, async (item) => {
      return this.runTest(item.case, item.input);
    });
  }
}
