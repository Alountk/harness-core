export interface ToolCall {
  tool: string;
  args: {
    filePath: string;
    content: string;
    [key: string]: any;
  };
}

export function parseToolCall(responseText: string): ToolCall | null {
  try {
    const match = responseText.match(/```json([\s\S]*?)```/);
    if (!match) return null;
    const json = JSON.parse(match[1]);
    return json as ToolCall;
  } catch (error) {
    return null;
  }
}
