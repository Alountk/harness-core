# AI Evaluation Harness Engine

A test harness for evaluating language model (LLM) outputs, built with TypeScript and Bun.

It allows you to run test suites against different providers (OpenAI, Google AI Studio/Gemini, Ollama, and LM Studio), apply heuristic evaluators, and generate result reports.

## Features

- Configurable concurrent execution.
- Per-test timeout with cancellation via AbortController.
- Retries per test case for unstable scenarios.
- AI provider adapters with a common interface.
- Included evaluators:
  - Validation by included/excluded keywords.
  - JSON output validation with Zod schemas.
- Console reporting and Markdown report generation.

## Requirements

- Bun 1.0+

## Installation

```bash
bun install
```

## Available Scripts

```bash
bun run dev
bun run start
bun test
bun run test:watch
bun run eval:live
```

## Environment Configuration (.env)

You can create an .env file in the project root. Bun loads it automatically.

Common variables:

```env
# Live evaluation (scripts/run-live-eval.ts)
GEMINI_API_KEY="your_api_key"
GEMINI_MODEL="gemini-2.5-flash"
LM_STUDIO_URL="http://localhost:1234/v1"
LM_STUDIO_API_KEY="sk-lm-token"

# Generic adapters (optional)
OPENAI_API_KEY="your_openai_key"
GOOGLE_AI_API_KEY="your_google_ai_studio_key"
LOCAL_AI_BASE_URL="http://localhost:11434"
OLLAMA_AI_MODEL="llama3.2"
```

## Quick Start

### 1) Run tests

```bash
bun test
```

### 2) Run a live evaluation

```bash
bun run eval:live
```

This script runs a hybrid suite:

- Google AI Studio (Gemini) in the cloud.
- LM Studio locally.

## Example Usage

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
      name: "Structured JSON Response",
      timeoutMs: 30000,
      retries: 0,
    },
    input: {
      systemPrompt: "Return a valid JSON object.",
      prompt: '{"topic":"Refactor Backend","priority":"HIGH"}',
    },
    evaluator: createJsonSchemaEvaluator(RecommendationSchema),
  },
]);

ConsoleReporter.printSummary(results);

const markdown = MarkdownReporter.generateReport(results, "Local Suite");
console.log(markdown);
```

## Project Structure

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

## Note on Historical Reports

The file [src/reporters/file.ts](src/reporters/file.ts) includes utilities for persistence and historical comparison (trend analysis).

It is not re-exported from [src/index.ts](src/index.ts), so it is used through an internal repository import.

## License

MIT
