import "dotenv/config";
import express from "express";
import { randomUUID } from "crypto";
import { HumanMessage } from "@langchain/core/messages";

import { llm } from "./config/llm.js";
import createAgentGraph from "./orchestration/graph.js";
import { prisma } from "./lib/prisma.js";
import { getSandbox } from "./tools/tool.js";

const APP_ROOT = "/home/user/react-app";

const app = express();
app.use(express.json());

const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello Likeable");
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

(async () => {
  try {
    const testUserId = randomUUID();
    const testProjectId = randomUUID();
    const testPrompt = "Create a Todo application";

    console.log("\nTesting LangGraph...");
    console.log(`User ID: ${testUserId}`);
    console.log(`Project ID: ${testProjectId}`);
    console.log(`Prompt: ${testPrompt}\n`);

    let actualUserId: string = testUserId;
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: "test@test.com" },
      });

      if (existingUser) {
        actualUserId = existingUser.id as string;
        console.log(`Using existing test user with ID: ${actualUserId}`);
      } else {
        await prisma.user.create({
          data: {
            id: testUserId,
            email: "test@test.com",
            password: "test",
          },
        });
        console.log(`Created new test user with ID: ${testUserId}`);
      }

      await prisma.project.upsert({
        where: { id: testProjectId },
        create: {
          id: testProjectId,
          title: "Test Project",
          initialPrompt: testPrompt,
          userId: actualUserId,
        },
        update: {
          title: "Test Project",
          initialPrompt: testPrompt,
        },
      });
      console.log(`Test project created/verified with ID: ${testProjectId}`);
    } catch (dbError: any) {
      console.warn(
        "Could not create test project in database. File persistence will fail but graph will continue:",
        dbError.message || dbError
      );
    }

    const sandbox = await getSandbox(testProjectId);
    const sandboxId = sandbox.sandboxId;
    const previewUrl = `https://${sandboxId}.e2b.app`;
    console.log(`Sandbox initialized for project: ${testProjectId}`);
    console.log(`Sandbox ID: ${sandboxId}`);
    console.log(`Sandbox Preview URL: ${previewUrl}`);

    const graph = await createAgentGraph({
      projectId: testProjectId,
      model: llm,
    });

    const initialState = {
      messages: [new HumanMessage(testPrompt)],
      projectId: testProjectId,
      sandbox: sandbox,
      plan: [],
    };

    console.log("Invoking graph...\n");
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: testProjectId },
      recursionLimit: 100, // Increase from default 25 to allow more complex workflows
    });

    console.log("Graph execution completed!");
    console.log("\nPlan:", result.plan);
    console.log("\nMessages count:", result.messages.length);

    console.log("\nStarting dev server...");
    try {
      // Check if server is already running
      const checkOutput = await sandbox.commands.run(
        `lsof -ti:5173 2>/dev/null || echo "not_running"`
      );
      if (!checkOutput.stdout.includes("not_running")) {
        console.log(`Dev server is already running on port 5173.`);
        console.log(`Preview URL: https://5173-${sandboxId}.e2b.app`);
      } else {
        // Check if package.json exists
        const checkPackageJson = await sandbox.commands.run(
          `cd ${APP_ROOT} && test -f package.json && echo "exists" || echo "missing"`
        );
        if (checkPackageJson.stdout.includes("missing")) {
          console.warn(`Error: package.json not found in ${APP_ROOT}. The agent may not have built the app properly.`);
        } else {
          // Start the dev server
          await sandbox.commands.run(
            `cd ${APP_ROOT} && nohup npm run dev > /tmp/vite.log 2>&1 &`
          );

          // Wait and verify server started
          let attempts = 0;
          let serverRunning = false;
          while (attempts < 15 && !serverRunning) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const verifyOutput = await sandbox.commands.run(
              `lsof -ti:5173 2>/dev/null || echo "not_running"`
            );
            if (!verifyOutput.stdout.includes("not_running")) {
              serverRunning = true;
              break;
            }
            attempts++;
          }

          if (serverRunning) {
            console.log(`Dev server started successfully on port 5173.`);
            console.log(`Preview URL: https://5173-${sandboxId}.e2b.app`);
          } else {
            const logs = await sandbox.commands.run(
              `tail -30 /tmp/vite.log 2>/dev/null || echo "No logs available"`
            );
            console.warn(`Dev server may not have started properly.`);
            console.log(`Logs:\n${logs.stdout}`);
            console.log(`\nYou can manually start it by running: cd ${APP_ROOT} && npm run dev`);
          }
        }
      }
    } catch (devError) {
      console.warn(`Could not start dev server automatically: ${devError}`);
      console.log(`You can manually start it by running: cd ${APP_ROOT} && npm run dev`);
    }

    console.log("\nFinal state:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Graph test failed:", error);
  }
})();
