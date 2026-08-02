import { test, expect } from "bun:test";
import type { AIProviderAdapter } from "../runners/ai/providers";
import { ProviderRegistry } from "./provider-registry";

test("ProviderRegistry should register and retrieve a provider factory", () => {
  const registry = new ProviderRegistry();

  const mockAdapter: AIProviderAdapter = {
    name: "MockProvider",
    generateResponse: async () => ({ text: "mock response" }),
  };

  registry.register("custom", () => mockAdapter);

  const factory = registry.get("custom");
  expect(factory).toBeDefined();
  expect(factory()).toBe(mockAdapter);
});

test("ProviderRegistry should throw an error for unregistered providers", () => {
  const registry = new ProviderRegistry();
  expect(() => registry.get("unknown")).toThrow(
    "Proveedor de IA no registrado: unknown",
  );
});
