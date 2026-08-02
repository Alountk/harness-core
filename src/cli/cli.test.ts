import { test, expect } from "bun:test";
import { parseCliArguments } from "./cli-parser";

test("parseCliArguments should extract goal, output, and test options correctly", () => {
  const args = [
    "node",
    "cli.ts",
    "--goal",
    "Create an add function",
    "--output",
    "src/add.ts",
    "--test",
    "tests/add.test.ts",
  ];
  const parsed = parseCliArguments(args);

  expect(parsed.goal).toBe("Create an add function");
  expect(parsed.outputPath).toBe("src/add.ts");
  expect(parsed.testPath).toBe("tests/add.test.ts");
});
