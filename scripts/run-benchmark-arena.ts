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
} from "../src/index";

async function main() {
  // 1. Parsear argumentos de la línea de comandos (CLI flags)
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

  // 2. Cargar archivo de configuración tolerante a comentarios y comas descolgadas
  const fileConfig = loadConfigFile(
    values.config ? String(values.config) : "harness.config.json",
  );

  // 3. Resolución de jerarquía de valores: CLI Flag > Archivo Config > Variable de Entorno > Valor por Defecto
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

  // Lista de modelos a competir
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

  console.log("⚔️  INICIANDO LOCAL BENCHMARK ARENA (Configuración Dinámica)\n");
  console.log(`📡 URL Servidor: ${lmStudioUrl}`);
  console.log(`⚖️ Modelo Juez: ${judgeModelName}`);
  console.log(
    `⏱️ Timeout por test: ${defaultTimeoutMs}ms | Concurrencia: ${concurrency}`,
  );
  console.log(`🤖 Modelos en competencia: ${rawModelsList.join(", ")}\n`);

  // 4. Instanciar dinámicamente los competidores
  const competitors = rawModelsList.map((modelId) => {
    // Generar un nombre corto para la tabla del Leaderboard
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

  // 5. Instanciar el modelo Juez
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
      "Evalúa si la respuesta explica de manera precisa, concisa y sin alucinaciones las ventajas clave de Bun sobre Node.js.",
  });

  const JsonSchema = z.object({
    architecturePattern: z.string(),
    recommendedTech: z.array(z.string()),
    estimatedTimeWeeks: z.number(),
  });

  // 6. Matriz de Prompts Idénticos (Benchmark Cases)
  const baseBenchmarkCases = [
    {
      id: "BENCH-001",
      name: "Explicación Técnica (LLM-as-a-Judge)",
      input: {
        systemPrompt: "Eres un desarrollador experto.",
        prompt:
          "¿Qué ventajas clave ofrece utilizar Bun frente a Node.js en proyectos modernos?",
      },
      evaluator: semanticJudge,
    },
    {
      id: "BENCH-002",
      name: "Generación de JSON Estructurado (Zod)",
      input: {
        systemPrompt:
          "Devuelve ÚNICAMENTE un objeto JSON válido sin bloques markdown ni texto adicional.",
        prompt:
          'Genera un JSON con este formato exacto: {"architecturePattern": "Microfrontends", "recommendedTech": ["React", "TypeScript"], "estimatedTimeWeeks": 4}',
      },
      evaluator: createJsonSchemaEvaluator(JsonSchema),
    },
    {
      id: "BENCH-003",
      name: "Inclusión de Conceptos Clave (Heurístico)",
      input: {
        systemPrompt: "Eres un arquitecto Frontend.",
        prompt:
          "Explica brevemente qué es Module Federation y cuál es su relación con React.",
      },
      evaluator: createContainsEvaluator({ includes: ["React", "Federation"] }),
    },
  ];

  const arenaLeaderboard: Record<string, TestResult[]> = {};
  const allFullResults: TestResult[] = [];

  // 7. Ejecutar la matriz de pruebas contra cada modelo
  for (const competitor of competitors) {
    console.log(
      `\n🏃 Ejecutando Benchmark contra modelo local: ${competitor.name}...`,
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
      console.error(`❌ Error ejecutando en ${competitor.name}:`, err);
    }
  }

  // 8. Imprimir Leaderboard en Consola
  console.log(
    "\n================ 🏆 LOCAL MODEL ARENA LEADERBOARD 🏆 ================",
  );
  console.log(
    `| Test ID | Metric | ${competitors.map((c) => c.shortName).join(" | ")} |`,
  );
  console.log(
    `| :--- | :--- | ${competitors.map(() => ":---:").join(" | ")} |`,
  );

  const baseTestIds = ["BENCH-001", "BENCH-002", "BENCH-003"];

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
    console.log(`| | **Latencia** | ${timeRow.join(" | ")} |`);
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

  console.log(`💾 Reportes persistidos:`);
  console.log(`   - JSON: ${savedInfo.jsonPath}`);
  console.log(`   - Markdown: ${savedInfo.mdPath}`);
  console.log(`   - Dashboard HTML: ${htmlPath}`);
}

main().catch((err) => {
  console.error("❌ Error en la ejecución del Arena Local:", err);
});
