import "dotenv/config";
import { Template, defaultBuildLogger } from "e2b";
import { reactTemplate } from "./e2b-template";

async function main() {
  console.log("Building React Template");
  await Template.build(reactTemplate, {
    alias: "react-base",
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  });
  console.log("Built Successful");
}

main().catch(console.error);
