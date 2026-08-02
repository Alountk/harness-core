import { GoogleAIStudioAdapter, LMStudioAdapter, OpenAIAdapter } from "../runners/ai/providers";
import { globalProviderRegistry } from "./provider-registry";

globalProviderRegistry.register("gemini", () => {
  return new GoogleAIStudioAdapter({ apiKey: process.env.GEMINI_API_KEY! });
  throw new Error("GeminiAdapter no inicializado en el setup");
});

globalProviderRegistry.register("openai", () => {
  return new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! });
  throw new Error("OpenAIAdapter no inicializado en el setup");
});

globalProviderRegistry.register("lmstudio", () => {
  return new LMStudioAdapter({ baseUrl: process.env.LM_STUDIO_URL!, apiKey: process.env.LM_STUDIO_API_KEY });
  throw new Error("LMStudioAdapter no inicializado en el setup");
});
