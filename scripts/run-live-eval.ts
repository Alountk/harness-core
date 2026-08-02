import { z } from "zod";
import {
  HarnessEngine,
  AIRunner,
  GoogleAIStudioAdapter,
  createContainsEvaluator,
  createJsonSchemaEvaluator,
  ConsoleReporter,
  MarkdownReporter,
  LMStudioAdapter,
  FileReporter,
  createLLMJudgeEvaluator,
} from "../src/index";

async function main() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const lmStudioUrl = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
  const lmStudioApiKey = process.env.LM_STUDIO_API_KEY || "";

  if (!geminiApiKey || geminiApiKey === "your_api_key_here") {
    console.error(
      "❌ ERROR: GEMINI_API_KEY is not set. Add it to your .env file or export it in the terminal.",
    );
    process.exit(1);
  }

  console.log(
    "🚀 Initializing the multi-provider harness with an LLM-as-a-Judge evaluator...\n",
  );

  const previousReport = FileReporter.getLatestReport();

  const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Adapter 1: Google Gemini Cloud
  const googleAdapter = new GoogleAIStudioAdapter({
    apiKey: geminiApiKey,
    defaultModel: "gemini-2.5-flash",
  });

  // Adapter 2: Local LM Studio
  const lmStudioAdapter = new LMStudioAdapter({
    baseUrl: lmStudioUrl,
    defaultModel: "local-model",
    apiKey: lmStudioApiKey,
  });

  // Create the AIRunner instances
  const googleRunner = new AIRunner({ adapter: googleAdapter });
  const lmStudioRunner = new AIRunner({ adapter: lmStudioAdapter });

  // Initialize the engine with concurrency = 2
  const googleEngine = new HarnessEngine(googleRunner, { concurrency: 2 });
  const lmStudioEngine = new HarnessEngine(lmStudioRunner, { concurrency: 1 });

  // Zod schema to validate the AI's structured output
  const ArchitectureRecommendationSchema = z.object({
    architecturePattern: z.string(),
    recommendedTech: z.array(z.string()),
    estimatedTimeWeeks: z.number(),
  });

  // LLM-as-a-Judge evaluator: this uses the Google Gemini model to judge the AI response against specific criteria.
  const semanticJudge = createLLMJudgeEvaluator({
    judgeRunner: googleRunner,
    minPassingScore: 0.8,
    criteria:
      "Evaluate whether the response clearly explains the speed, bundling, or runtime advantages of Bun compared with Node.js, while keeping a professional tone and avoiding false information.",
  });

  // Google suite
  const cloudSuite = [
    {
      case: {
        id: "LIVE-GEMINI-001",
        name: "Google Gemini: Frontend Responses",
        timeoutMs: 20000,
      },
      input: {
        model: DEFAULT_MODEL,
        systemPrompt: "You are an expert frontend architect.",
        prompt:
          "Briefly explain what Module Federation is in React and what its key advantages are.",
      },
      evaluator: createContainsEvaluator({
        includes: ["React", "Federation"],
      }),
    },
    {
      case: {
        id: "LIVE-GEMINI-002",
        name: "Google Gemini: Structured JSON Output",
        timeoutMs: 20000,
        retries: 1,
      },
      input: {
        model: DEFAULT_MODEL,
        systemPrompt:
          "Return ONLY a valid JSON object with no additional explanatory text.",
        prompt:
          'Generate an architecture recommendation for a web project using the following JSON format: {"architecturePattern": "Micro Frontends", "recommendedTech": ["React", "TypeScript", "Bun"], "estimatedTimeWeeks": 4}',
      },
      evaluator: createJsonSchemaEvaluator(ArchitectureRecommendationSchema),
    },
  ];

  // Local LM Studio suite
  const lmStudioSuite = [
    {
      case: {
        id: "LOCAL-LMSTUDIO-001",
        name: "Local LM Studio: Concept Check (Contains)",
        timeoutMs: 60000, // Generous margin for local CPU/GPU inference
        retries: 0,
      },
      input: {
        systemPrompt: "You are an expert developer.",
        prompt:
          "Answer briefly: what advantages does Bun have over Node.js?",
      },
      evaluator: createContainsEvaluator({
        includes: ["Bun"],
      }),
    },
    {
      case: {
        id: "LOCAL-LMSTUDIO-002",
        name: "Local LM Studio: Semantic Evaluation (LLM-as-a-Judge)",
        timeoutMs: 140000,
        retries: 0,
      },
      input: {
        systemPrompt: "You are a senior software developer.",
        prompt:
          "Why would a development team choose Bun over Node.js for a modern microservice?",
      },
      evaluator: semanticJudge, // 👈  Judge Evaluator
    },
  ];

  const allResults = [];

  if (geminiApiKey && geminiApiKey !== "your_api_key_here") {
    console.log("📡 Running cloud evaluation against Google Gemini...");
    const cloudResults = await googleEngine.runSuite(cloudSuite);
    allResults.push(...cloudResults);
  } else {
    console.log("⚠️ GEMINI_API_KEY not detected. Skipping cloud tests.");
  }

  console.log(
    `\n🏠 Running evaluation against LM Studio at ${lmStudioUrl}...`,
  );
  try {
    const lmResults = await lmStudioEngine.runSuite(lmStudioSuite);
    allResults.push(...lmResults);
  } catch (err) {
    console.error(
      `❌ Error connecting to LM Studio at ${lmStudioUrl}. Check that the local server is running.`,
    );
  }

  // Print a summary of all results and save it to disk
  ConsoleReporter.printSummary(allResults);

  // Save the historical report
  const savedInfo = FileReporter.saveReport(
    allResults,
    "Cloud Gemini vs Local LM Studio Hybrid Evaluation",
  );

  console.log(`💾 Reports saved successfully:`);
  console.log(`   - JSON: ${savedInfo.jsonPath}`);
  console.log(`   - Markdown: ${savedInfo.mdPath}`);

  // Compare with the previous report if one exists
  if (previousReport) {
    const delta = FileReporter.compareWithPrevious(allResults, previousReport);
    if (delta) {
      FileReporter.printTrendSummary(delta);
    }
  } else {
    console.log(
      "\n💡 First run recorded. Future runs will show trend comparisons.",
    );
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error during execution:", err);
});
