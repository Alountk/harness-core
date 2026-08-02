const languageCode = ["typescript", "ts", "javascript", "js"];

export function cleanMarkdownCode(rawText: string): string {
  let cleaned = rawText.trim();
  
  // 1. Eliminar bloques completos con comillas invertidas (ej: ```typescript ... ```)
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```\s*$/gm, "$1");
  
  // 2. Por si acaso quedaron restos o etiquetas sueltas al inicio (ej: "typescript\n" o "js\n")
  cleaned = cleaned.replace(new RegExp(`^(${languageCode.join("|")})\\s*\\n?`, "i"), "");
  
  return cleaned.trim();
}