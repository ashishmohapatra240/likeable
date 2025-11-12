import "dotenv/config";
import express from "express";
import { ChatAnthropic } from "@langchain/anthropic";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { add_dependency, createToolsWithContext, hello_world } from "./tools/tool.js";
import { Sandbox } from "@e2b/code-interpreter";
import { createAgent } from "langchain";

const app = express();

app.use(express.json());

const llm = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  model: "claude-3-7-sonnet-20250219",
});



const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


const sbx = await Sandbox.create();
const execution = await sbx.runCode('print("hello world")');
// console.log(execution.logs);

// const files = await sbx.files.list("/");
// console.log(files);



const tools = createToolsWithContext({
  sandbox: sbx,
  socket: null,
  projectId: "123",
});

const agent = createAgent({
  model: llm,
  tools: tools,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "create a new file called app.tsx with the content 'console.log(\"Hello, world!\")'" }]
});

console.log("Final result:", result);
