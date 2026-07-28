import { describe, expect, test } from "bun:test";
import { HarnessEngine } from "../src/index";
import type { TaskRunner } from "../src/index";

describe("HarnessEngine Resilience", () => {
  test("should handle timeouts correctly", async () => {
    const slowRunner: TaskRunner<{ delay: number }, { ok: boolean }> = {
      name: "Slow Runner",
      execute: async (input, signal) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, input.delay);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("Aborted"));
          });
        });
        return { ok: true };
      },
    };

    const engine = new HarnessEngine(slowRunner);

    const result = await engine.runTest(
      { id: "TIMEOUT-1", name: "Timeout Test", timeoutMs: 100, retries: 0 },
      { delay: 500 }
    );

    expect(result.status).toBe("TIMEOUT");
    expect(result.attempts).toBe(1);
  });

  test("should retry flaky tasks until success", async () => {
    let attempts = 0;
    const flakyRunner: TaskRunner<void, { ok: boolean }> = {
      name: "Flaky Runner",
      execute: async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("Temporary failure");
        }
        return { ok: true };
      },
    };

    const engine = new HarnessEngine(flakyRunner);

    const result = await engine.runTest(
      { id: "RETRY-1", name: "Retry Test", timeoutMs: 1000, retries: 2 },
      undefined
    );

    expect(result.status).toBe("PASSED");
    expect(result.attempts).toBe(2);
  });
});