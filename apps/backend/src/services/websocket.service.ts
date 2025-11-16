import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { handleAgentRequest } from "./agent.service.js";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("Websocket Connected");

    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const projectId = url.searchParams.get("projectId") || "default";

    ws.on("close", () => {
      console.log("Websoket connection closed");
    });

    ws.on("error", (error) => {
      console.error("Websocket error", error);
    });

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "start_agent") {
          await handleAgentRequest({
            projectId,
            prompt: data.prompt,
            socket: ws,
          });
        }
      } catch (error) {
        console.error(error);
        await sendToWs(ws, {
          e: "error",
          message: (error as any).message,
        });
      }
    });
  });
}

export function sendToWs(
  socket: WebSocket | null | undefined,
  data: unknown
): Promise<boolean> {
  if (!socket || socket.readyState !== WebSocket.OPEN)
    return Promise.resolve(false);
  try {
    socket.send(JSON.stringify(data));
    return Promise.resolve(true);
  } catch (e) {
    console.error(e);
    return Promise.resolve(false);
  }
}
