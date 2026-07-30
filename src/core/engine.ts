import type { Evaluator } from "../evals/evaluators";
import { mapConcurrent } from "../utils/concurrency";
import type { TaskRunner, TestCase, TestResult } from "./types";

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

  async runTest(
    testCase: TestCase,
    input: TInput,
    evaluator?: Evaluator,
  ): Promise<TestResult> {
    const maxRetries = testCase.retries ?? 0;
    const timeoutMs = testCase.timeoutMs ?? 5000; // Default timeout of 5 seconds

    let attempts = 0;
    let lastError: Error | undefined;
    const startTime = performance.now();

    while (attempts <= maxRetries) {
      attempts++;
      const controller = new AbortController();
      let timer: Timer | undefined;

      try {
        if (this.runner.setup) {
          await this.runner.setup();
        }

        // Promise with automatic timeout handling
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort(); // Abort the task if it exceeds the timeout
            reject(new Error(`Test case timed out after ${timeoutMs} ms`));
          }, timeoutMs);
        });

        const output = await Promise.race([
          this.runner.execute(input, controller.signal),
          timeoutPromise,
        ]);

        if (timer) {
          clearTimeout(timer); // Clear the timeout if the task completes in time
        }

        let evalResult;
        if (evaluator) {
          evalResult = await evaluator(output as any, controller.signal);
        }

        const endTime = performance.now();
        const durationMs = Math.round(endTime - startTime);

        const isPassed = evalResult ? evalResult.passed : true;

        return {
          testId: testCase.id,
          status: isPassed ? "PASSED" : "FAILED",
          durationMs,
          attempts,
          evalResult,
          error:
            !isPassed && evalResult?.reason
              ? new Error(`Evaluation Failed: ${evalResult.reason}`)
              : undefined,
        };
      } catch (error) {
        if (timer) clearTimeout(timer); // Clear the timeout if an error occurs

        const isTimeout =
          error instanceof Error && error.message.includes("timed out");
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempts > maxRetries) {
          const endTime = performance.now();
          const durationMs = Math.round(endTime - startTime);
          return {
            testId: testCase.id,
            status: isTimeout ? "TIMEOUT" : "FAILED",
            durationMs,
            attempts,
            error: lastError,
          };
        }
      } finally {
        if (this.runner.teardown) {
          await this.runner.teardown();
        }
      }
    }
    // Security fallback: If all retries fail, return the last error encountered
    return {
      testId: testCase.id,
      status: "FAILED",
      durationMs: Math.round(performance.now() - startTime),
      attempts,
      error: lastError ?? new Error("Unknown error occurred"),
    };
  }

  async runSuite(
    testSuite: Array<{ case: TestCase; input: TInput; evaluator?: Evaluator }>,
  ): Promise<TestResult[]> {
    return mapConcurrent(testSuite, this.concurrency, async (item) => {
      return this.runTest(item.case, item.input, item.evaluator);
    });
  }
}
