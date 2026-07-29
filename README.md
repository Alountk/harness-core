# AI Evaluation Harness Engine

Arnes de pruebas para evaluaciones de modelos de lenguaje (LLM Evals), construido con TypeScript y Bun.

Permite ejecutar suites de pruebas contra distintos proveedores (OpenAI, Google AI Studio/Gemini, Ollama y LM Studio), aplicar evaluadores heuristicos y generar reportes de resultados.

## Caracteristicas

- Ejecucion concurrente configurable.
- Timeout por caso de prueba con cancelacion via AbortController.
- Reintentos por test case para escenarios inestables.
- Adaptadores de proveedores AI con una interfaz comun.
- Evaluadores incluidos:
  - Validacion por palabras incluidas/excluidas.
  - Validacion de salida JSON con esquemas Zod.
- Reporte por consola y generacion de reporte en Markdown.

## Requisitos

- Bun 1.0+

## Instalacion

```bash
bun install
```

## Scripts disponibles

```bash
bun run dev
bun run start
bun test
bun run test:watch
bun run eval:live
```

## Configuracion de entorno (.env)

Puedes crear un archivo .env en la raiz del proyecto. Bun lo carga automaticamente.

Variables comunes:

```env
# Evaluacion en vivo (scripts/run-live-eval.ts)
GEMINI_API_KEY="tu_api_key"
GEMINI_MODEL="gemini-2.5-flash"
LM_STUDIO_URL="http://localhost:1234/v1"
LM_STUDIO_API_KEY="sk-lm-token"

# Adaptadores genericos (opcionales)
OPENAI_API_KEY="tu_openai_key"
GOOGLE_AI_API_KEY="tu_google_ai_studio_key"
LOCAL_AI_BASE_URL="http://localhost:11434"
OLLAMA_AI_MODEL="llama3.2"
```

## Uso rapido

### 1) Ejecutar tests

```bash
bun test
```

### 2) Ejecutar evaluacion en vivo

```bash
bun run eval:live
```

Este script ejecuta una suite hibrida:

- Google AI Studio (Gemini) en la nube.
- LM Studio en local.

## Ejemplo de uso

```ts
import { z } from "zod";
import {
  HarnessEngine,
  AIRunner,
  LMStudioAdapter,
  createJsonSchemaEvaluator,
  ConsoleReporter,
  MarkdownReporter,
} from "./src/index";

const adapter = new LMStudioAdapter({
  baseUrl: "http://localhost:1234/v1",
  apiKey: "sk-lm-token",
  defaultModel: "local-model",
});

const runner = new AIRunner({ adapter });
const engine = new HarnessEngine(runner, { concurrency: 1 });

const RecommendationSchema = z.object({
  topic: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const results = await engine.runSuite([
  {
    case: {
      id: "EVAL-001",
      name: "Respuesta JSON estructurada",
      timeoutMs: 30000,
      retries: 0,
    },
    input: {
      systemPrompt: "Devuelve un JSON valido.",
      prompt: '{"topic":"Refactor Backend","priority":"HIGH"}',
    },
    evaluator: createJsonSchemaEvaluator(RecommendationSchema),
  },
]);

ConsoleReporter.printSummary(results);

const markdown = MarkdownReporter.generateReport(results, "Suite Local");
console.log(markdown);
```

## Estructura del proyecto

```text
.
├── config/
├── scripts/
│   └── run-live-eval.ts
├── src/
│   ├── core/
│   │   ├── engine.ts
│   │   └── types.ts
│   ├── evals/
│   │   └── evaluators.ts
│   ├── fixtures/
│   │   └── fixture.ts
│   ├── reporters/
│   │   ├── console.ts
│   │   ├── file.ts
│   │   └── markdown.ts
│   ├── runners/
│   │   ├── ai.runner.ts
│   │   └── ai/
│   │       └── providers.ts
│   └── index.ts
├── tests/
├── package.json
└── README.md
```

## Nota sobre reportes historicos

El archivo src/reporters/file.ts incluye utilidades para persistencia y comparativa historica (trend analysis).

Actualmente no esta reexportado desde src/index.ts, por lo que se usa mediante import directo interno del repositorio.

## Licencia

MIT
