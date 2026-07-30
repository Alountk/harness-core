import { describe, expect, test } from "bun:test";
import { parseConfigJson } from "../src/utils/config";

describe("Config Loader Utility", () => {
  test("debe parsear un JSON válido estándar", () => {
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

  test("debe limpiar comentarios JS (// y /* */) y parsear correctamente", () => {
    const rawWithComments = `
      // Configuración de Homelab
      {
        /* Servidor local */
        "url": "http://111.111.111.30:1234/v1",
        "judgeModel": "qwen2.5-7b-instruct" // Modelo para juzgar
      }
    `;

    const parsed = parseConfigJson(rawWithComments);
    expect(parsed.url).toBe("http://111.111.111.30:1234/v1");
    expect(parsed.judgeModel).toBe("qwen2.5-7b-instruct");
  });

  test("debe soportar comas finales descolgadas (trailing commas)", () => {
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

  test("debe manejar BOM UTF-8 sin arrojar excepción", () => {
    const rawWithBOM = "\uFEFF" + JSON.stringify({ concurrency: 2 });
    const parsed = parseConfigJson(rawWithBOM);
    expect(parsed.concurrency).toBe(2);
  });
});
