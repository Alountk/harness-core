// src/index.ts
import { HarnessEngine } from "./core/engine";
import type { TaskRunner, TestCase } from "./core/types";
import { ConsoleReporter } from "./reporters/console";

const dummyRunner: TaskRunner<{ payload: string }, { result: string }> = {
  name: "Dummy Processing Runner",
  execute: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async processing

    if (input.payload === "error") {
      throw new Error("Simulated processing failure!");
    }

    return { result: `Processed: ${input.payload}` };
  },
};

const engine = new HarnessEngine(dummyRunner);

const testCases: Array<{ case: TestCase; input: { payload: string } }> = [
  {
    case: { id: "TEST-001", name: "Successful Run", timeoutMs: 1000 },
    input: { payload: "hello world" },
  },
  {
    case: { id: "TEST-002", name: "Failing Run", timeoutMs: 1000 },
    input: { payload: "error" },
  },
];

async function main() {
  console.log(
    `🚀 Starting Harness Execution [Runner: ${dummyRunner.name}]...\n`,
  );
  const results = [];

  for (const item of testCases) {
    const result = await engine.runTest(item.case, item.input);
    results.push(result);
  }

  ConsoleReporter.printSummary(results);
}

main();
