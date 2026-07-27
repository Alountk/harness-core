// src/index.ts
import { HarnessEngine } from "./core/engine";
import type { TaskRunner, TestCase } from "./core/types";
import { ConsoleReporter } from "./reporters/console";

const asyncRunner: TaskRunner<
  { id: number; delayMs: number },
  { ok: boolean }
> = {
  name: "Async Task Runner",
  execute: async (input) => {
    // Simula una tarea asíncrona de I/O o red
    await new Promise((resolve) => setTimeout(resolve, input.delayMs));

    if (input.id === 4) {
      throw new Error(`Task #${input.id} explicitly failed!`);
    }

    return { ok: true };
  },
};

const engine = new HarnessEngine(asyncRunner, { concurrency: 3 });

const suite: Array<{ case: TestCase; input: { id: number; delayMs: number } }> =
  Array.from({ length: 6 }, (_, index) => ({
    case: {
      id: `TASK-00${index + 1}`,
      name: `Concurrent Task ${index + 1}`,
      timeoutMs: 2000,
    },
    input: { id: index + 1, delayMs: 500 },
  }));

async function main() {
  console.log(
    `🚀 Starting Harness Execution [Runner: ${asyncRunner.name}]...\n`,
  );
  const totalStartTime = performance.now();

  // Run the all suite concurrently with the specified concurrency limit
  const results = await engine.runSuite(suite);

  const totalDuration = Math.round(performance.now() - totalStartTime);

  ConsoleReporter.printSummary(results);
  console.log(`⏱️ Total Suite Execution Time: ${totalDuration} ms`);
}

main();
