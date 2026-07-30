import { z } from "zod";
import {
  HarnessEngine,
  AIRunner,
  LMStudioAdapter,
  createContainsEvaluator,
  createJsonSchemaEvaluator,
  createLLMJudgeEvaluator,
  FileReporter,
  type TestResult,
} from "../src/index";

async function main() {
  const lmStudioUrl = process.env.LM_STUDIO_URL || "http://111.111.111.30:1234/v1";
  const lmStudioApiKey = process.env.LM_STUDIO_API_KEY || process.env.LM_API_TOKEN || "";

  console.log("⚔️  STARTING LOCAL BENCHMARK ARENA (LM Studio Homelab)\n");

  // 1. Instantiate the local LM Studio models that will compete
  const gemmaRunner = new AIRunner({
    adapter: new LMStudioAdapter({
      baseUrl: lmStudioUrl,
      apiKey: lmStudioApiKey,
      defaultModel: "google/gemma-4-e4b",
    }),
  });

  const qwenCoderRunner = new AIRunner({
    adapter: new LMStudioAdapter({
      baseUrl: lmStudioUrl,
      apiKey: lmStudioApiKey,
      defaultModel: "qwen2.5-coder-7b-instruct",
    }),
  });

  const qwen35Runner = new AIRunner({
    adapter: new LMStudioAdapter({
      baseUrl: lmStudioUrl,
      apiKey: lmStudioApiKey,
      defaultModel: "qwen3.5-4b-super-coder",
    }),
  });

  // Runner assigned to act as the impartial judge (using Qwen 2.5 7B Instruct)
  const judgeRunner = new AIRunner({
    adapter: new LMStudioAdapter({
      baseUrl: lmStudioUrl,
      apiKey: lmStudioApiKey,
      defaultModel: "qwen2.5-7b-instruct",
    }),
  });

  // List of competitors with a local-inference-specific timeout
  const competitors = [
    {
      name: "Google Gemma 4 e4b",
      shortName: "Gemma-4",
      engine: new HarnessEngine(gemmaRunner, { concurrency: 1 }),
      defaultTimeoutMs: 120000,
    },
    {
      name: "Qwen 2.5 Coder 7B",
      shortName: "Qwen2.5-7B",
      engine: new HarnessEngine(qwenCoderRunner, { concurrency: 1 }),
      defaultTimeoutMs: 120000,
    },
    {
      name: "Qwen 3.5 4B Super Coder",
      shortName: "Qwen3.5-4B",
      engine: new HarnessEngine(qwen35Runner, { concurrency: 1 }),
      defaultTimeoutMs: 120000,
    },
  ];

  // 2. Define the local impartial judge
  const semanticJudge = createLLMJudgeEvaluator({
    judgeRunner: judgeRunner,
    minPassingScore: 0.8,
    criteria: "Evaluate whether the response explains the key advantages of Bun over Node.js accurately, concisely, and without hallucinations.",
  });

  const JsonSchema = z.object({
    architecturePattern: z.string(),
    recommendedTech: z.array(z.string()),
    estimatedTimeWeeks: z.number(),
  });

  // 3. Identical prompt matrix (benchmark cases)
  const baseBenchmarkCases = [
    {
      id: "BENCH-001",
      name: "Technical Explanation (LLM-as-a-Judge)",
      input: {
        systemPrompt: "You are an expert developer.",
        prompt: "What key advantages does using Bun instead of Node.js offer in modern projects?",
      },
      evaluator: semanticJudge,
    },
    {
      id: "BENCH-002",
      name: "Structured JSON Generation (Zod)",
      input: {
        systemPrompt: "Return ONLY a valid JSON object with no markdown blocks or additional text.",
        prompt: 'Generate a JSON with this exact format: {"architecturePattern": "Microfrontends", "recommendedTech": ["React", "TypeScript"], "estimatedTimeWeeks": 4}',
      },
      evaluator: createJsonSchemaEvaluator(JsonSchema),
    },
    {
      id: "BENCH-003",
      name: "Key Concept Inclusion (Heuristic)",
      input: {
        systemPrompt: "You are a frontend architect.",
        prompt: "Briefly explain what Module Federation is and how it relates to React.",
      },
      evaluator: createContainsEvaluator({ includes: ["React", "Federation"] }),
    },
  ];

  const arenaLeaderboard: Record<string, TestResult[]> = {};
  const allFullResults: TestResult[] = [];

  // 4. Run the test matrix against each local model
  for (const competitor of competitors) {
    console.log(`\n🏃 Running benchmark against local model: ${competitor.name}...`);

    const suite = baseBenchmarkCases.map((b) => ({
      case: {
        id: `${b.id} [${competitor.shortName}]`,
        name: `${b.name} (${competitor.shortName})`,
        timeoutMs: competitor.defaultTimeoutMs,
      },
      input: b.input,
      evaluator: b.evaluator,
    }));

    try {
      const results = await competitor.engine.runSuite(suite);
      arenaLeaderboard[competitor.name] = results;
      allFullResults.push(...results);
    } catch (err) {
      console.error(`❌ Error ejecutando en ${competitor.name}:`, err);
    }
  }

  // 5. Print the leaderboard to the console
  console.log("\n================ 🏆 LOCAL MODEL ARENA LEADERBOARD 🏆 ================");
  console.log(`| Test ID | Metric | ${competitors.map((c) => c.shortName).join(" | ")} |`);
  console.log(`| :--- | :--- | ${competitors.map(() => ":---:").join(" | ")} |`);

  const baseTestIds = ["BENCH-001", "BENCH-002", "BENCH-003"];

  for (const baseId of baseTestIds) {
    const statusRow = competitors.map((c) => {
      const res = arenaLeaderboard[c.name]?.find((r) => r.testId.startsWith(baseId));
      return res ? (res.status === "PASSED" ? "✅ PASSED" : res.status === "TIMEOUT" ? "⏱️ TIMEOUT" : "❌ FAILED") : "N/A";
    });

    const timeRow = competitors.map((c) => {
      const res = arenaLeaderboard[c.name]?.find((r) => r.testId.startsWith(baseId));
      return res ? `${res.durationMs} ms` : "N/A";
    });

    const scoreRow = competitors.map((c) => {
      const res = arenaLeaderboard[c.name]?.find((r) => r.testId.startsWith(baseId));
      if (!res) return "N/A";
      const scoreVal = res.evalResult?.score !== undefined ? res.evalResult.score : (res.status === "PASSED" ? 1 : 0);
      return `${(scoreVal * 100).toFixed(0)}%`;
    });

    console.log(`| **${baseId}** | **Status** | ${statusRow.join(" | ")} |`);
    console.log(`| | **Latency** | ${timeRow.join(" | ")} |`);
    console.log(`| | **Eval Score** | ${scoreRow.join(" | ")} |`);
  }
  console.log("====================================================================\n");

  // 6. Save the persistent report
  const savedInfo = FileReporter.saveReport(allFullResults, "Local Homelab Models Arena Benchmark");
  console.log(`💾 Reports persisted for local models:`);
  console.log(`   - JSON: ${savedInfo.jsonPath}`);
  console.log(`   - Markdown: ${savedInfo.mdPath}`);
}

main().catch((err) => {
  console.error("❌ Error during the local arena run:", err);
});