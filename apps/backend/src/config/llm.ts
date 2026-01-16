import { ChatOpenAI } from "@langchain/openai";

export const llm = new ChatOpenAI({
  model: "openai/gpt-4o-mini",
  temperature: 0.8,
  streaming: true,
  apiKey: process.env.OPENROUTER_API_KEY || "",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://agent.com",
      "X-Title": "Agent",
    },
  },
});

// import { ChatOpenAI } from "@langchain/openai";

// export const llm = new ChatOpenAI({
//   model: "gpt-5.1-chat-latest",
//   // temperature: 0.8,
//   streaming: true,
//   apiKey: process.env.OPENAI_API_KEY || "",
// });
