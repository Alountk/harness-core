import { test, expect } from "bun:test";
import { AgentHistory } from "./history";

test("AgentHistory should initialize with system prompt and accumulate messages", () => {
  const history = new AgentHistory("You are a helpful coding assistant.");

  expect(history.getMessages().length).toBe(1);
  expect(history.getMessages()[0].role).toBe("system");

  history.addUserMessage("Write a hello world function");
  history.addAssistantMessage(
    "export function hello() { console.log('hello'); }",
  );

  const messages = history.getMessages();
  expect(messages.length).toBe(3);
  expect(messages[1].role).toBe("user");
  expect(messages[2].role).toBe("assistant");
});

test("AgentHistory should clear or reset correctly", () => {
  const history = new AgentHistory("System prompt");
  history.addUserMessage("Task 1");
  history.clear();

  expect(history.getMessages().length).toBe(1);
  expect(history.getMessages()[0].role).toBe("system");
});
