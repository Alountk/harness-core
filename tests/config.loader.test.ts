import { describe, expect, test } from "bun:test";
import { parseConfigJson } from "../src/utils/config";

describe("Config Loader Utility", () => {
  test("should parse a standard valid JSON payload", () => {
    const raw = JSON.stringify({
      url: "http://localhost:1234/v1",
      timeoutMs: 60000,
      models: ["model-a", "model-b"],
    });

    const parsed = parseConfigJson(raw);
    expect(parsed.url).toBe("http://localhost:1234/v1");
    expect(parsed.timeoutMs).toBe(60000);
    expect(parsed.models).toEqual(["model-a", "model-b"]);
  });

  test("should strip JavaScript comments and parse correctly", () => {
    const rawWithComments = `
      // Homelab configuration
      {
        /* Local server */
        "url": "http://111.111.111.30:1234/v1",
        "judgeModel": "qwen2.5-7b-instruct" // Judge model
      }
    `;

    const parsed = parseConfigJson(rawWithComments);
    expect(parsed.url).toBe("http://111.111.111.30:1234/v1");
    expect(parsed.judgeModel).toBe("qwen2.5-7b-instruct");
  });

  test("should support trailing commas", () => {
    const rawWithTrailingCommas = `
      {
        "url": "http://localhost:1234/v1",
        "timeoutMs": 120000,
        "models": [
          "gemma-4",
          "qwen-2.5",
        ],
      }
    `;

    const parsed = parseConfigJson(rawWithTrailingCommas);
    expect(parsed.timeoutMs).toBe(120000);
    expect(parsed.models).toHaveLength(2);
  });

  test("should handle UTF-8 BOM without throwing", () => {
    const rawWithBOM = "\uFEFF" + JSON.stringify({ concurrency: 2 });
    const parsed = parseConfigJson(rawWithBOM);
    expect(parsed.concurrency).toBe(2);
  });
});
