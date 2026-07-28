import { z } from "zod";
import {
  HarnessEngine,
  AIRunner,
  GoogleAIStudioAdapter,
  createContainsEvaluator,
  createJsonSchemaEvaluator,
  ConsoleReporter,
  MarkdownReporter,
} from "../src/index";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "tu_api_key_aqui_real") {
    console.error(
      "❌ ERROR: GEMINI_API_KEY no configurada. Añádela en tu archivo .env o impórtala en la terminal."
    );
    process.exit(1);
  }

  console.log("🚀 Inicializando Harness con Google Gemini API...\n");

  const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Instantiate the real Google Gemini adapter
  const googleAdapter = new GoogleAIStudioAdapter({
    apiKey,
    defaultModel: DEFAULT_MODEL,
  });

  // Create the AIRunner with the Google Gemini adapter
  const runner = new AIRunner({ adapter: googleAdapter });

  // Initialize the engine with concurrency = 2
  const engine = new HarnessEngine(runner, { concurrency: 2 });

  // Zod schema to validate the structured output of the AI
  const ArchitectureRecommendationSchema = z.object({
    architecturePattern: z.string(),
    recommendedTech: z.array(z.string()),
    estimatedTimeWeeks: z.number(),
  });

  // Suite of tests with real calls
  const suite = [
    {
      case: {
        id: "LIVE-GEMINI-001",
        name: "Evaluación de respuesta de texto (Conceptos Frontend)",
        timeoutMs: 20000,
      },
      input: {
        model: DEFAULT_MODEL,
        systemPrompt: "Eres un arquitecto experto en Frontend.",
        prompt: "Explica brevemente qué es Module Federation en React y cuáles son sus ventajas clave.",
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

  console.log(`📡 Enviando ${suite.length} consultas a Google Gemini en paralelo...\n`);
  const startTime = performance.now();

  // execute the suite and collect results
  const results = await engine.runSuite(suite);

  const duration = Math.round(performance.now() - startTime);

  // Imprimimos los resultados en consola
  ConsoleReporter.printSummary(results);
  console.log(`⏱️ Tiempo total de llamada e inferencia: ${duration} ms\n`);

  // Printing Markdown report for potential CI/CD integration
  const mdReport = MarkdownReporter.generateReport(results, "Google Gemini Real-World Evaluation");
  console.log("---------------- GENERATED MARKDOWN REPORT ----------------");
  console.log(mdReport);
  console.log("-----------------------------------------------------------");
}

main().catch((err) => {
  console.error("❌ Error inesperado durante la ejecución:", err);
});