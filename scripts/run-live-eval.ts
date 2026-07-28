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
} from "../src/index";

async function main() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const lmStudioUrl = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
  const lmStudioApiKey = process.env.LM_STUDIO_API_KEY || "";

  if (!geminiApiKey || geminiApiKey === "tu_api_key_aqui_real") {
    console.error(
      "❌ ERROR: GEMINI_API_KEY no configurada. Añádela en tu archivo .env o impórtala en la terminal.",
    );
    process.exit(1);
  }

  console.log("🚀 Inicializando Harness con Google Gemini API...\n");

  const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Adapter 1: Google Gemini Cloud
  const googleAdapter = new GoogleAIStudioAdapter({
    apiKey: geminiApiKey,
    defaultModel: "gemini-2.5-flash",
  });

  // Adapter 2: LM Studio Local
  const lmStudioAdapter = new LMStudioAdapter({
    baseUrl: lmStudioUrl,
    defaultModel: "local-model",
    apiKey: lmStudioApiKey,
  });

  // Create the AIRunner
  const googleRunner = new AIRunner({ adapter: googleAdapter });
  const lmStudioRunner = new AIRunner({ adapter: lmStudioAdapter });

  // Initialize the engine with concurrency = 2
  const googleEngine = new HarnessEngine(googleRunner, { concurrency: 2 });
  const lmStudioEngine = new HarnessEngine(lmStudioRunner, { concurrency: 1 });

  // Zod schema to validate the structured output of the AI
  const ArchitectureRecommendationSchema = z.object({
    architecturePattern: z.string(),
    recommendedTech: z.array(z.string()),
    estimatedTimeWeeks: z.number(),
  });

  // Suite for Google
  const cloudSuite = [
    {
      case: {
        id: "LIVE-GEMINI-001",
        name: "Evaluación de respuesta de texto (Conceptos Frontend)",
        timeoutMs: 20000,
      },
      input: {
        model: DEFAULT_MODEL,
        systemPrompt: "Eres un arquitecto experto en Frontend.",
        prompt:
          "Explica brevemente qué es Module Federation en React y cuáles son sus ventajas clave.",
      },
      evaluator: createContainsEvaluator({
        includes: ["React", "Federation"],
      }),
    },
    {
      case: {
        id: "LIVE-GEMINI-002",
        name: "Evaluación de salida JSON estructurada",
        timeoutMs: 12000,
      },
      input: {
        model: DEFAULT_MODEL,
        systemPrompt:
          "Devuelve ÚNICAMENTE un objeto JSON válido sin texto explicativo adicional.",
        prompt:
          'Genera una recomendación de arquitectura para un proyecto web usando el siguiente formato JSON: {"architecturePattern": "Micro Frontends", "recommendedTech": ["React", "TypeScript", "Bun"], "estimatedTimeWeeks": 4}',
      },
      evaluator: createJsonSchemaEvaluator(ArchitectureRecommendationSchema),
    },
  ];

  // Suite for LM Studio Local
  const lmStudioSuite = [
    {
      case: {
        id: "LOCAL-LMSTUDIO-001",
        name: "LM Studio Local: Verificación de Conceptos",
        timeoutMs: 60000, // Margen holgado para inferencia en CPU/GPU local
        retries: 0,
      },
      input: {
        systemPrompt: "Eres un desarrollador experto.",
        prompt:
          "Responde brevemente: ¿Qué ventajas tiene utilizar Bun sobre Node.js?",
      },
      evaluator: createContainsEvaluator({
        includes: ["Bun"],
      }),
    },
  ];

  const allResults = [];

  if (geminiApiKey && geminiApiKey !== "tu_api_key_aqui_real") {
    console.log("📡 Ejecutando evaluación Cloud contra Google Gemini...");
    const cloudResults = await googleEngine.runSuite(cloudSuite);
    allResults.push(...cloudResults);
  } else {
    console.log("⚠️ GEMINI_API_KEY no detectada. Saltando pruebas Cloud.");
  }

  console.log(
    `\n🏠 Ejecutando evaluación contra LM Studio en ${lmStudioUrl}...`,
  );
  try {
    const lmResults = await lmStudioEngine.runSuite(lmStudioSuite);
    allResults.push(...lmResults);
  } catch (err) {
    console.error(
      `❌ Error conectando con LM Studio en ${lmStudioUrl}. Verifica que el servidor local esté iniciado.`,
    );
  }
  
  const startTime = performance.now();

    ConsoleReporter.printSummary(allResults);

  const mdReport = MarkdownReporter.generateReport(allResults, "Cloud Gemini vs LM Studio Local Hybrid Evaluation");
  console.log("---------------- GENERATED MARKDOWN REPORT ----------------");
  console.log(mdReport);
  console.log("-----------------------------------------------------------");
}

main().catch((err) => {
  console.error("❌ Error inesperado durante la ejecución:", err);
});
