import * as fs from "node:fs";
import * as path from "node:path";

export interface HarnessConfigFile {
  url?: string;
  apiKey?: string;
  judgeModel?: string;
  timeoutMs?: number;
  concurrency?: number;
  models?: string[];
}

/**
 * Sanitizes a JSON string by removing comments, trailing commas, and BOM characters.
 *
 */
export function sanitizeJsonString(rawJson: string): string {
  return rawJson
    .replace(/^\uFEFF/, "") // Elimina BOM UTF-8
    .replace(/\/\*[\s\S]*?\*\//g, "") // Elimina comentarios /* ... */
    .replace(/(?<!:)\/\/.*/g, "") // Elimina // solo si NO va precedido de ":" (ej. http://)
    .replace(/,\s*([\}\]])/g, "$1"); // Elimina comas descolgadas
}

/**
 * Safely parses a JSON string after applying the sanitization.
 */
export function parseConfigJson(rawJson: string): HarnessConfigFile {
  const sanitized = sanitizeJsonString(rawJson);
  if (!sanitized.trim()) {
    return {};
  }
  return JSON.parse(sanitized) as HarnessConfigFile;
}

/**
 * Loads the configuration from a local JSON file if it exists, tolerant to common syntax errors.
 */
export function loadConfigFile(
  configPath = "harness.config.json",
): HarnessConfigFile {
  const fullPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(fullPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return parseConfigJson(content);
  } catch (err) {
    console.warn(
      `⚠️ No se pudo parsear ${configPath}:`,
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}
