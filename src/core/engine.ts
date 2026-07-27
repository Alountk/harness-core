// src/core/engine.ts
import type { TaskRunner, TestCase, TestResult } from "./types";

export class HarnessEngine<TInput, TOutput> {
  private runner: TaskRunner<TInput, TOutput>;

  constructor(runner: TaskRunner<TInput, TOutput>) {
    this.runner = runner;
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
}
