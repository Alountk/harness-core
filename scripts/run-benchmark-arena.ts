import { z } from "zod";
import { parseArgs } from "node:util";
import {
  HarnessEngine,
  AIRunner,
  LMStudioAdapter,
  createContainsEvaluator,
  createJsonSchemaEvaluator,
  createLLMJudgeEvaluator,
  FileReporter,
  HtmlReporter,
  loadConfigFile,
  type TestResult,
  createCodeSyntaxEvaluator,
} from "../src/index";

async function main() {
  // 1. Parse command-line arguments (CLI flags)
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      models: { type: "string", short: "m" },
      judge: { type: "string", short: "j" },
      url: { type: "string", short: "u" },
      timeout: { type: "string", short: "t" },
      concurrency: { type: "string", short: "c" },
      config: { type: "string" },
    },
    strict: false,
  });

  // 2. Load a configuration file that tolerates comments and trailing commas
  const fileConfig = loadConfigFile(
    values.config ? String(values.config) : "harness.config.json",
  );

  // 3. Resolve value precedence: CLI flag > config file > environment variable > default
  const lmStudioUrl =
    (values.url as string) ||
    fileConfig.url ||
    process.env.LM_STUDIO_URL ||
    "http://111.111.111.30:1234/v1";

  const lmStudioApiKey =
    fileConfig.apiKey ||
    process.env.LM_STUDIO_API_KEY ||
    process.env.LM_API_TOKEN ||
    "";

  const judgeModelName =
    (values.judge as string) ||
    fileConfig.judgeModel ||
    process.env.JUDGE_MODEL ||
    "qwen2.5-7b-instruct";

  const defaultTimeoutMs = values.timeout
    ? parseInt(String(values.timeout), 10)
    : fileConfig.timeoutMs || 120000;

  const concurrency = values.concurrency
    ? parseInt(String(values.concurrency), 10)
    : fileConfig.concurrency || 1;

  // List of models to compete
  let rawModelsList: string[] = [];
  if (values.models) {
    rawModelsList = String(values.models)
      .split(",")
      .map((m) => m.trim());
  } else if (fileConfig.models && fileConfig.models.length > 0) {
    rawModelsList = fileConfig.models;
  } else {
    rawModelsList = [
      "google/gemma-4-e4b",
      "qwen2.5-coder-7b-instruct",
      "qwen3.5-4b-super-coder",
    ];
  }

  console.log("⚔️  INITIATING LOCAL BENCHMARK ARENA (Dynamic Configuration)\n");
  console.log(`📡 Server URL: ${lmStudioUrl}`);
  console.log(`⚖️ Judge Model: ${judgeModelName}`);
  console.log(
    `⏱️ Timeout by test: ${defaultTimeoutMs}ms | Concurrency: ${concurrency}`,
  );
  console.log(`🤖 Competing Models: ${rawModelsList.join(", ")}\n`);

  // 4. Instantiate competitors dynamically
  const competitors = rawModelsList.map((modelId) => {
    // Generate a short name for the leaderboard table
    const shortName = modelId.includes("/") ? modelId.split("/")[1] : modelId;

    const runner = new AIRunner({
      adapter: new LMStudioAdapter({
        baseUrl: lmStudioUrl,
        apiKey: lmStudioApiKey,
        defaultModel: modelId,
      }),
    });

    return {
      name: modelId,
      shortName,
      engine: new HarnessEngine(runner, { concurrency }),
      defaultTimeoutMs,
    };
  });

  // 5. Instantiate the judge model
  const judgeRunner = new AIRunner({
    adapter: new LMStudioAdapter({
      baseUrl: lmStudioUrl,
      apiKey: lmStudioApiKey,
      defaultModel: judgeModelName,
    }),
  });

  const semanticJudge = createLLMJudgeEvaluator({
    judgeRunner,
    minPassingScore: 0.8,
    criteria:
      "Evaluate if the response explains accurately, concisely, and without hallucinations the key advantages of Bun over Node.js.",
  });

  const JsonSchema = z.object({
    architecturePattern: z.string(),
    recommendedTech: z.array(z.string()),
    estimatedTimeWeeks: z.number(),
  });

  // 6. Matrix of identical prompts (benchmark cases)
  const baseBenchmarkCases = [
    {
      id: "BENCH-001",
      name: "Technical Explanation (LLM-as-a-Judge)",
      input: {
        systemPrompt: "You are an expert developer.",
        prompt:
          "What are the key advantages of using Bun over Node.js in modern projects?",
      },
      evaluator: semanticJudge,
    },
    {
      id: "BENCH-002",
      name: "Structured JSON Generation (Zod)",
      input: {
        systemPrompt:
          "Return ONLY a valid JSON object without markdown blocks or any additional text.",
        prompt:
          'Generate a JSON with this exact format: {"architecturePattern": "Microfrontends", "recommendedTech": ["React", "TypeScript"], "estimatedTimeWeeks": 4}',
      },
      evaluator: createJsonSchemaEvaluator(JsonSchema),
    },
    {
      id: "BENCH-003",
      name: "Inclusion of Key Concepts (Heuristic)",
      input: {
        systemPrompt: "You are a Frontend architect.",
        prompt:
          "Explain briefly what Module Federation is and its relationship with React.",
      },
      evaluator: createContainsEvaluator({ includes: ["React", "Federation"] }),
    },
    {
      id: "BENCH-004",
      name: "Valid TypeScript Code Generation (Syntax)",
      input: {
        systemPrompt:
          "You are an expert TypeScript developer. Return only the code inside a markdown block.",
        prompt:
          "Write a generic TypeScript function called 'debounce' that receives a function and a wait time, with proper types.",
      },
      evaluator: createCodeSyntaxEvaluator({ loader: "ts" }),
    },
    {
      id: "BENCH-005",
      name: "Valid TypeScript Code Generation (Syntax)",
      input: {
        systemPrompt: "You are an expert TypeScript developer. Return only the code inside a markdown block.",
        prompt: "Write a generic TypeScript utility function called 'debounce' that receives a callback and a wait time, with proper types.",
      },
      evaluator: createCodeSyntaxEvaluator({ loader: "ts" }),
    },
  ];

  const arenaLeaderboard: Record<string, TestResult[]> = {};
  const allFullResults: TestResult[] = [];

  // 7. Run the benchmark matrix against each model
  for (const competitor of competitors) {
    console.log(
      `\n🏃 Executing Benchmark against local model: ${competitor.name}...`,
    );

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
      console.error(`❌ Error in ${competitor.name}:`, err);
    }
  }

  // 8. Print the leaderboard to the console
  console.log(
    "\n================ 🏆 LOCAL MODEL ARENA LEADERBOARD 🏆 ================",
  );
  console.log(
    `| Test ID | Metric | ${competitors.map((c) => c.shortName).join(" | ")} |`,
  );
  console.log(
    `| :--- | :--- | ${competitors.map(() => ":---:").join(" | ")} |`,
  );

  const baseTestIds = ["BENCH-001", "BENCH-002", "BENCH-003", "BENCH-004", "BENCH-005"];

  for (const baseId of baseTestIds) {
    const statusRow = competitors.map((c) => {
      const res = arenaLeaderboard[c.name]?.find((r) =>
        r.testId.startsWith(baseId),
      );
      return res
        ? res.status === "PASSED"
          ? "✅ PASSED"
          : res.status === "TIMEOUT"
            ? "⏱️ TIMEOUT"
            : "❌ FAILED"
        : "N/A";
    });

    const timeRow = competitors.map((c) => {
      const res = arenaLeaderboard[c.name]?.find((r) =>
        r.testId.startsWith(baseId),
      );
      return res ? `${res.durationMs} ms` : "N/A";
    });

    const scoreRow = competitors.map((c) => {
      const res = arenaLeaderboard[c.name]?.find((r) =>
        r.testId.startsWith(baseId),
      );
      if (!res) return "N/A";
      const scoreVal =
        res.evalResult?.score !== undefined
          ? res.evalResult.score
          : res.status === "PASSED"
            ? 1
            : 0;
      return `${(scoreVal * 100).toFixed(0)}%`;
    });

    console.log(`| **${baseId}** | **Status** | ${statusRow.join(" | ")} |`);
    console.log(`| | **Latency** | ${timeRow.join(" | ")} |`);
    console.log(`| | **Eval Score** | ${scoreRow.join(" | ")} |`);
  }
  console.log(
    "====================================================================\n",
  );

  // 9. Guardar informes persistentes
  const savedInfo = FileReporter.saveReport(
    allFullResults,
    "Local Homelab Models Arena Benchmark",
  );
  const htmlPath = HtmlReporter.saveDashboard(
    allFullResults,
    "Local Homelab Models Arena Benchmark",
  );

  console.log(`💾 Saved reports:`);
  console.log(`   - JSON: ${savedInfo.jsonPath}`);
  console.log(`   - Markdown: ${savedInfo.mdPath}`);
  console.log(`   - Dashboard HTML: ${htmlPath}`);
}

main().catch((err) => {
  console.error("❌ Error while running the local arena:", err);
});
