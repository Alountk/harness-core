import { describe, expect, test } from "bun:test";
import { createLatencyEvaluator } from "../src/index";

describe("Latency and Performance SLO Evaluator", () => {
  test("should pass when the duration is below the maximum limit", () => {
    const evaluator = createLatencyEvaluator({ maxDurationMs: 5000 });

    // Simulate an execution that took 1200ms
    const result = evaluator("Any response", undefined, {
      durationMs: 1200,
    });

    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  test("should fail when the duration exceeds the configured maximum", () => {
    const evaluator = createLatencyEvaluator({ maxDurationMs: 1000 });

    // Simulate a slow execution that took 2500ms
    const result = evaluator("Slow response", undefined, {
      durationMs: 2500,
    });

    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toContain("Response took too long");
  });
});
