import { AIRunner, LMStudioAdapter } from "../src/index";
import { CodeAgent } from "../src/agent/loop";

async function main() {
  const lmStudioUrl =
    process.env.LM_STUDIO_URL || "http://111.111.111.30:1234/v1";
  const lmStudioApiKey = process.env.LM_STUDIO_API_KEY || "";

  console.log("🤖 Inicializando Code Agent conectado a LM Studio Local...\n");

  const adapter = new LMStudioAdapter({
    baseUrl: lmStudioUrl,
    apiKey: lmStudioApiKey,
    defaultModel: "qwen3.5-4b-super-coder", // O tu modelo preferido en el Homelab
  });

  const agent = new CodeAgent(adapter);

  const result = await agent.run({
    goal: "Escribe una función en TypeScript llamada 'groupBy' que agrupe los elementos de un array basándose en una función de clave, con tipado genérico estricto.",
    maxIterations: 3,
    loader: "ts",
  });

  console.log("\n================ 🏁 AGENT EXECUTION RESULT ================");
  console.log(`Success: ${result.success ? "✅ YES" : "❌ NO"}`);
  console.log(`Total Iterations: ${result.iterations}`);
  if (result.finalCode) {
    console.log("\nFinal Code Generated:\n");
    console.log(result.finalCode);
  }
  console.log("===========================================================\n");
}

main().catch((err) => {
  console.error("❌ Error en la ejecución del Agente:", err);
});
