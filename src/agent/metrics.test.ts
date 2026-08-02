import { test, expect } from "bun:test";
import { saveAgentReport } from "./metrics";
import * as fs from "node:fs/promises";

test("saveAgentReport should create a JSON report file with execution details", async () => {
  const mockResult = {
    success: true,
    iterations: 2,
    finalCode: "export const x = 1;",
    history: [{ role: "user", content: "test goal" }],
  };

  const reportPath = await saveAgentReport(
    mockResult,
    "Test Goal",
    "./temp-reports",
  );

  expect(reportPath).toBeDefined();

  // Verificamos que el archivo existe y contiene la información correcta
  const content = await fs.readFile(reportPath, "utf-8");
  const parsed = JSON.parse(content);

  expect(parsed.success).toBe(true);
  expect(parsed.iterations).toBe(2);
  expect(parsed.goal).toBe("Test Goal");

  // Limpieza
  await fs.rm("./temp-reports", { recursive: true, force: true });
});
