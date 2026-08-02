import { CodeAgent } from "../agent/loop";
import { saveAgentReport } from "../agent/metrics";
import { parseCliArguments } from "./cli-parser";
import { resolveAIAdapter } from "./provider.factory";

async function main() {
  const options = parseCliArguments(process.argv);

  if (!options.goal) {
    console.error(
      "❌ Error: Debes especificar un objetivo usando el flag --goal",
    );
    console.log(
      'Ejemplo: bun run src/cli/run.ts --goal "Crea una función suma" --output src/math.ts --test tests/math.test.ts',
    );
    process.exit(1);
  }

  console.log(`🚀 Iniciando CodeAgent para el objetivo: "${options.goal}"`);

  try {
    // Obtenemos el adaptador de forma completamente agnóstica
    const adapter = resolveAIAdapter();
    const agent = new CodeAgent(adapter);

    const result = await agent.run({
      goal: options.goal,
      outputPath: options.outputPath,
      testPath: options.testPath,
      contextFiles: options.contextFiles,
      maxIterations: 5,
    });

    const reportPath = await saveAgentReport(result, options.goal);
    console.log(`📊 Reporte de métricas guardado en: ${reportPath}`);

    if (result.success) {
      console.log(
        `\n✨ ¡Tarea completada con éxito en ${result.iterations} iteraciones!`,
      );
      if (options.outputPath) {
        console.log(`📁 Archivo generado en: ${options.outputPath}`);
      }
    } else {
      console.log(
        `\n❌ El agente no pudo completar la tarea tras ${result.iterations} iteraciones.`,
      );
      process.exit(1);
    }
  } catch (error: any) {
    console.error(
      `\n❌ Error crítico en la ejecución del agente: ${error.message}`,
    );
    process.exit(1);
  }
}

main();
