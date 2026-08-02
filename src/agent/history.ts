export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AgentHistory {
  private messages: ChatMessage[] = [];

  constructor(systemPrompt: string) {
    this.messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  addUserMessage(content: string) {
    this.messages.push({
      role: "user",
      content,
    });
  }

  addAssistantMessage(content: string) {
    this.messages.push({
      role: "assistant",
      content,
    });
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clear(): void {
    const systemPrompt = this.messages[0];
    if (!systemPrompt || systemPrompt.role !== "system") {
      throw new Error("System prompt is missing or invalid.");
    }
    this.messages = [systemPrompt];
  }
}
