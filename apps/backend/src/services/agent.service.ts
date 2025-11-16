import { ChatAnthropic } from "@langchain/anthropic";
import { Sandbox } from "@e2b/code-interpreter";
import { createAgent } from "langchain";
import { createToolsWithContext } from "../tools/tool.js";
import { WebSocket } from "ws";
import { sendToWs } from "./websocket.service.js";

interface AgentRequest {
  projectId: string;
  prompt: string;
  socket: WebSocket;
}

export async function handleAgentRequest({
  projectId,
  prompt,
  socket,
}: AgentRequest) {
  const sandbox = await Sandbox.create();

  try {
    const llm = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: "claude-3-7-sonnet-20250219",
    });

    const tools = createToolsWithContext({
      sandbox,
      socket,
      projectId,
    });

    const agent = createAgent({
      model: llm,
      tools,
    });

    await sendToWs(socket, {
      e: "agent_started",
      message: "Agent is starting to process your request",
    });

    const stream = await agent.streamEvents(
      {
        messages: [{ role: "user", content: prompt }],
      },
      { version: "v2" }
    );

    for await (const event of stream) {
      if (event.event === "on_tool_start") {
        await sendToWs(socket, {
          e: "tool_started",
          tool: event.name,
          input: event.data?.input,
        });
      } else if (event.event === "on_tool_end") {
        await sendToWs(socket, {
          e: "tool_completed",
          tool: event.name,
          output: event.data?.output,
        });
      } else if (
        event.event === "on_chain_start" &&
        event.name === "AgentExecutor"
      ) {
        await sendToWs(socket, {
          e: "agent_thinking",
          message: "Agent is processing your Request",
        });
      } else if (
        event.event === "on_chain_end" &&
        event.name === "AgentExecutor"
      ) {
        await sendToWs(socket, {
          e: "agent_completed",
          message: "Agent completed processing",
        });
      }
    }
  } catch (error) {
    console.error("Agent error:", error);
    await sendToWs(socket, {
      e: "agent_error",
      message: (error as any).message,
    });
  }
}
