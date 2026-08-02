import * as fs from "node:fs/promises";

export async function readWorkspaceFile(filePath: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data;
  } catch (error: any) {
    return `Error reading file ${filePath}: ${error.message}`;
  }
}
