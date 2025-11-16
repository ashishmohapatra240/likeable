import "dotenv/config";
import express from "express";
import { setupWebSocket } from "./services/websocket.service.js";

const app = express();
app.use(express.json());

const port = 3000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

setupWebSocket(server);
