import { test, expect } from "bun:test";
import { cleanMarkdownCode } from "./utils";

test("cleanMarkdownCode should remove typescript markdown blocks", () => {
  const input = "```typescript\nexport const x = 10;\n```";
  const result = cleanMarkdownCode(input);
  expect(result).toBe("export const x = 10;");
});

test("cleanMarkdownCode should handle raw language tags without backticks", () => {
  const input = "typescript\nexport const x = 10;";
  const result = cleanMarkdownCode(input);
  expect(result).toBe("export const x = 10;");
});