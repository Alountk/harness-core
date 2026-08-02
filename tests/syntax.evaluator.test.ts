import { describe, expect, test } from "bun:test";
import { createCodeSyntaxEvaluator } from "../src/index";

describe("Code Syntax Evaluator", () => {
  test("should validate a syntactically correct TypeScript code block", () => {
    const evaluator = createCodeSyntaxEvaluator({ loader: "ts" });
    const codeSnippet =
      "const add = (a: number, b: number): number => a + b;\nconsole.log(add(2, 3));";
    const validResponse = {
      text: "typescript\n" + codeSnippet + "\n",
    };
    const result = evaluator(validResponse);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });
  test("should detect a TypeScript syntax error", () => {
    const evaluator = createCodeSyntaxEvaluator({ loader: "ts" });
    const invalidSnippet = "const add = (a: number, b: number => a + b;";
    const invalidResponse = {
      text: "typescript\n" + invalidSnippet + "\n",
    };

    const result = evaluator(invalidResponse);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toContain("Code Syntax Error");
  });
});
