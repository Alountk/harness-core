import { test, expect } from "bun:test";
import { runCodeTests } from "./test-runner";

test("runCodeTests should return success when execution passes", async () => {
  // Simulamos un ejecutor que retorna código de salida 0 (éxito)
  const mockExecutor = async () => ({
    exitCode: 0,
    stdout: "All tests passed",
    stderr: "",
  });

  const result = await runCodeTests("dummy-path.test.ts", mockExecutor);
  expect(result.passed).toBe(true);
  expect(result.output).toContain("All tests passed");
});

test("runCodeTests should return failure and reasons when execution fails", async () => {
  // Simulamos un ejecutor que retorna código de salida distinto de 0 (fallo)
  const mockExecutor = async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "Expected true to be false",
  });

  const result = await runCodeTests("dummy-path.test.ts", mockExecutor);
  expect(result.passed).toBe(false);
  expect(result.reason).toContain("Expected true to be false");
});
