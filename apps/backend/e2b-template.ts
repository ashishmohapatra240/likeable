import { Template, waitForTimeout } from "e2b";

export const reactTemplate = Template()
  .fromBaseImage()
  .setEnvs({
    NODE_ENV: "development",
    REACT_APP_ROOT: "/home/user/react-app",
  })
  .runCmd([
    "mkdir -p /home/user/react-app",
    "cd /home/user/react-app && npm create vite@latest . -- --template react-ts --yes",
    "cd /home/user/react-app && npm install",
  ])
  .runCmd([
    "cd /home/user/react-app && npm install react-router-dom || true",
    "cd /home/user/react-app && npm install tailwindcss postcss autoprefixer || true",
  ])
  .setStartCmd(
    "cd /home/user/react-app && npm run dev || echo 'React Template Ready'",
    waitForTimeout(2000)
  );
