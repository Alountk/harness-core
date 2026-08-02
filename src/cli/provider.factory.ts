import type { AIProviderAdapter } from "../runners/ai/providers";
import { globalProviderRegistry } from "./provider-registry";
import "./providers-setup";
export function resolveAIAdapter(): AIProviderAdapter {
  const providerType = process.env.AI_PROVIDER ?? "gemini";
  
  try {
    const factory = globalProviderRegistry.get(providerType);
    return factory();
  } catch (error: any) {
    throw new Error(`Error al resolver el proveedor '${providerType}': ${error.message}. Proveedores disponibles: ${globalProviderRegistry.getAvailableProviders().join(", ")}`);
  }
}