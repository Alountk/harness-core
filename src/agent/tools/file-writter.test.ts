import { test, expect } from "bun:test";
import * as fs from "node:fs/promises";
import { writeWorkspaceFile } from "./file-writter";

test("writeWorkspaceFile should write content to a specified path successfully", async () => {
  const targetPath = "./temp-workspace-test.ts";
  const content = "export const foo = 'bar';";

  const result = await writeWorkspaceFile(targetPath, content);

  expect(result.success).toBe(true);

  const savedContent = await fs.readFile(targetPath, "utf-8");
  expect(savedContent).toBe(content);

  // Limpieza
  await fs.unlink(targetPath);
});
