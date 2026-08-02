import { test, expect } from "bun:test";
import { parseToolCall } from "./parser";

test("parseToolCall should extract tool name and arguments from JSON block", () => {
  const llmResponse = `
    Voy a escribir el archivo necesario.
    \`\`\`json
    {
      "tool": "writeWorkspaceFile",
      "args": {
        "filePath": "codegen/math.ts",
        "content": "export const add = (a: number, b: number) => a + b;"
      }
    }
    \`\`\`
  `;

  const parsed = parseToolCall(llmResponse);
  expect(parsed).not.toBeNull();
  expect(parsed?.tool).toBe("writeWorkspaceFile");
  expect(parsed?.args.filePath).toBe("codegen/math.ts");
  expect(parsed?.args.content).toContain("export const add");
});

test("parseToolCall should return null if no valid tool block exists", () => {
  const llmResponse = "Sólo estoy pensando en el código...";
  const parsed = parseToolCall(llmResponse);
  expect(parsed).toBeNull();
});
