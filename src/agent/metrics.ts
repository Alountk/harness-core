import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface AgentRunResult {
  success: boolean;
  finalCode: string;
  iterations: number;
  history: Array<{ role: string; content: string }>;
}

export async function saveAgentReport(
  result: AgentRunResult,
  goal: string,
  outputDir: string = "reports",
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `agent-report-${timestamp}.json`;
  const filePath = path.join(outputDir, filename);

  const reportData = {
    timestamp: new Date().toISOString(),
    goal,
    success: result.success,
    iterations: result.iterations,
    history: result.history,
  };
  await fs.writeFile(filePath, JSON.stringify(reportData, null, 2), "utf-8");
  return filePath;
}
