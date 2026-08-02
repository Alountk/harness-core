export interface TestExecutionResult {
  passed: boolean;
  output: string;
  reason?: string;
}

export type CommandExecutor = (
  filePath: string,
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

const defaultExecutor: CommandExecutor = async (filePath: string) => {
  const normalizedPath =
    filePath.startsWith("./") || filePath.startsWith("/")
      ? filePath
      : `./${filePath}`;
  const proc = Bun.spawn(["bun", "test", normalizedPath], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
};

export async function runCodeTests(
  filePath: string,
  executor: CommandExecutor = defaultExecutor,
) {
  try {
    const result = await executor(filePath);
    const passed = result.exitCode === 0;

    return {
      passed,
      output: result.stdout + "\n" + result.stderr,
      reason: passed ? undefined : result.stderr || result.stdout,
    };
  } catch (error) {
    return {
      passed: false,
      output: "",
      reason: (error as Error).message,
    };
  }
}
