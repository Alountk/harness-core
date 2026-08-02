import { test, expect, mock } from "bun:test";
import { CodeAgent } from "../src/agent/loop";

test("CodeAgent should succeed on first iteration", async () => {
  const mockAdapter = {
    generateResponse: mock(async () => ({ text: "export function test() {}" })),
  };
  const agent = new CodeAgent(mockAdapter as any);
  const result = await agent.run({ goal: "test", loader: "ts" });
  expect(result.success).toBe(true);
});

test("CodeAgent should retry on failure", async () => {
  let count = 0;
  const mockAdapter = {
    generateResponse: mock(async () => {
      count++;
      if (count === 1) return { text: "broken code {" };
      return { text: "export function fixed() {}" };
    }),
  };
  const agent = new CodeAgent(mockAdapter as any);
  const result = await agent.run({ goal: "test", loader: "ts" });
  expect(result.iterations).toBe(2);
});
