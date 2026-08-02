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
    .replace(/^\uFEFF/, "") // Remove UTF-8 BOM
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments /* ... */
    .replace(/(?<!:)\/\/.*/g, "") // Remove // only if it is not preceded by ':' (e.g. http://)
    .replace(/,\s*([\}\]])/g, "$1"); // Remove trailing commas
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
      `⚠️ Could not parse ${configPath}:`,
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}
