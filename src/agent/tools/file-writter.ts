import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ToolExecutionResult {
  success: boolean;
  message: string;
}

export async function writeWorkspaceFile(
  filePath: string,
  content: string,
): Promise<ToolExecutionResult> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, "utf-8");
    return {
      success: true,
      message: `File successfully written to ${filePath}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to write file ${filePath}: ${error.message}`,
    };
  }
}
