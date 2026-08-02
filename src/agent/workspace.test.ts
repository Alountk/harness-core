import { test, expect } from "bun:test";
import { readWorkspaceFile } from "./workspace";
import * as fs from "node:fs/promises";

test("readWorkspaceFile should read file content successfully", async () => {
  const testPath = "./temp-test-file.txt";
  await fs.writeFile(testPath, "hello workspace", "utf-8");

  const content = await readWorkspaceFile(testPath);
  expect(content).toBe("hello workspace");

  await fs.unlink(testPath);
});

test("readWorkspaceFile should handle non-existent files gracefully", async () => {
  const content = await readWorkspaceFile("./non-existent-file-xyz.txt");
  expect(content).toContain("Error reading file");
});
