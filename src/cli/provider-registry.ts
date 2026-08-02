import type { AIProviderAdapter } from "../runners/ai/providers";

export type ProviderFactory = () => AIProviderAdapter;

export class ProviderRegistry {
  private providers: Map<string, ProviderFactory> = new Map();

  register(name: string, factory: ProviderFactory): void {
    this.providers.set(name.toLowerCase(), factory);
  }

  get(name: string): ProviderFactory {
    const factory = this.providers.get(name.toLowerCase());
    if (!factory) {
      throw new Error(`Proveedor de IA no registrado: ${name}`);
    }
    return factory;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const globalProviderRegistry = new ProviderRegistry();
