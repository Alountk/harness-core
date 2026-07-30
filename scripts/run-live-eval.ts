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

  if (!geminiApiKey || geminiApiKey === "tu_api_key_aqui_real") {
    console.error(
      "❌ ERROR: GEMINI_API_KEY no configurada. Añádela en tu archivo .env o impórtala en la terminal.",
    );
    process.exit(1);
  }

  console.log(
    "🚀 Inicializando Harness Multi-Proveedor con Evaluador LLM-as-a-Judge...\n",
  );

  const previousReport = FileReporter.getLatestReport();

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

  // Evaluator LLM-as-a-Judge: This evaluator will use the Google Gemini model to judge the AI's response based on specific criteria.
  const semanticJudge = createLLMJudgeEvaluator({
    judgeRunner: googleRunner,
    minPassingScore: 0.8,
    criteria:
      "Evalúa si la respuesta explica claramente las ventajas de velocidad, empaquetado o motor de ejecución de Bun en comparación con Node.js, manteniendo un tono profesional y sin información falsa.",
  });

  // Suite for Google
  const cloudSuite = [
    {
      case: {
        id: "LIVE-GEMINI-001",
        name: "Google Gemini: Respuestas Frontend",
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
        name: "Google Gemini: Salida JSON estructurada",
        timeoutMs: 20000,
        retries: 1,
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
        name: "LM Studio Local: Verificación de Conceptos (Contains)",
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
    {
      case: {
        id: "LOCAL-LMSTUDIO-002",
        name: "LM Studio Local: Evaluación Semántica (LLM-as-a-Judge)",
        timeoutMs: 140000,
        retries: 0,
      },
      input: {
        systemPrompt: "Eres un desarrollador senior de software.",
        prompt:
          "¿Por qué un equipo de desarrollo elegiría Bun sobre Node.js para un microservicio moderno?",
      },
      evaluator: semanticJudge, // 👈  Judge Evaluator
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

  // Print summary of all results and save to file
  ConsoleReporter.printSummary(allResults);

  // Historic report saving
  const savedInfo = FileReporter.saveReport(
    allResults,
    "Cloud Gemini vs LM Studio Local Hybrid Evaluation",
  );

  console.log(`💾 Reportes guardados exitosamente:`);
  console.log(`   - JSON: ${savedInfo.jsonPath}`);
  console.log(`   - Markdown: ${savedInfo.mdPath}`);

  // Compare with previous report if exists
  if (previousReport) {
    const delta = FileReporter.compareWithPrevious(allResults, previousReport);
    if (delta) {
      FileReporter.printTrendSummary(delta);
    }
  } else {
    console.log(
      "\n💡 Primera ejecución registrada. Las próximas ejecuciones mostrarán comparativas de tendencias.",
    );
  }
}

main().catch((err) => {
  console.error("❌ Error inesperado durante la ejecución:", err);
});
