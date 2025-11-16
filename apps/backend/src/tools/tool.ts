import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { sendToWs } from "../services/websocket.service.js";
import { WebSocket } from "ws";

const APP_ROOT = "/home/user/react-app";

export function createToolsWithContext(params: {
  sandbox: Sandbox;
  socket: WebSocket | null;
  projectId: string;
}) {
  const { sandbox, socket, projectId } = params;
  return [
    add_dependency(sandbox, socket, projectId),
    create_file(sandbox, socket, projectId),
    read_file(sandbox, socket, projectId),
    delete_file(sandbox, socket, projectId),
    execute_command(sandbox, socket, projectId),
    rename_file(sandbox, socket, projectId),
    list_directories(sandbox, socket, projectId),
    get_context(sandbox, socket, projectId),
    save_context(sandbox, socket, projectId),
    test_build(sandbox, socket, projectId),
    write_mutiple_files(sandbox, socket, projectId),
    check_missing_dependencies(sandbox, socket, projectId),
    hello_world(sandbox, socket, projectId),
  ];
}

export const add_dependency = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { pkg } = z
        .object({
          pkg: z
            .string()
            .describe("The npm package to install, e.g. react-icons"),
        })
        .parse(input);

      await sendToWs(socket, {
        e: "dependency_installation_started",
        message: `Installing dependency: ${pkg}`,
        dependency: pkg,
      });

      try {
        const command = `npm install ${pkg}`;
        const execution = await sandbox.runCode(`!${command}`, {
          language: "bash",
        });

        await sendToWs(socket, {
          e: "dependency_installation_completed",
          message: `Installed dependency: ${pkg}`,
          dependency: pkg,
        });
      } catch (e) {
        console.error(e);
        await sendToWs(socket, {
          e: "dependency_error",
          message: `Failed to install dependency: ${pkg}`,
          dependency: pkg,
        });
        return `Failed to install dependency: ${pkg}`;
      }
    },
    {
      name: "add-dependency",
      description:
        "Use this tool to add a dependency to the project. The dependency should be a valid npm package name.",
      schema: z.object({
        pkg: z
          .string()
          .describe("The npm package to install, e.g. react-icons"),
      }),
    }
  );

export const create_file = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { filepath, content } = z
        .object({ filepath: z.string(), content: z.string() })
        .parse(input);

      const fullPath = `${APP_ROOT}/${filepath.replace(/^\/+/, "")}`;

      await sendToWs(socket, {
        e: "file_creation_started",
        message: `Creating file: ${filepath}`,
        filepath: filepath,
      });

      try {
        let fixedContent = content;

        try {
          fixedContent = content
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r");
        } catch {}

        const writeCommand = `
        import os
        os.makedirs(os.path.dirname("${fullPath}"), exist_ok=True)
        with open("${fullPath}", "w", encoding="utf-8") as f:
            f.write(r"""${fixedContent}""")
        `;

        const execution = await sandbox.runCode(writeCommand);

        await sendToWs(socket, {
          e: "file_created",
          message: `Created ${filepath}`,
          filepath: filepath,
        });

        return `File ${filepath} created successfully.`;
      } catch (e) {
        console.error(e);

        await sendToWs(socket, {
          e: "file_error",
          message: `Failed to create ${filepath}: ${e}`,
          filepath: filepath,
        });
        return `Failed to create file: ${e}`;
      }
    },
    {
      name: "write",
      description:
        "Create a file with the given content at the specified path.",
      schema: z.object({
        filepath: z
          .string()
          .describe("The file path to write to, e.g. src/index.js"),
        content: z.string().describe("The content to write to the file"),
      }),
    }
  );

export const read_file = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { filePath } = z.object({ filePath: z.string() }).parse(input);
      const fullPath = `${APP_ROOT}/${filePath.replace(/^\/+/, "")}`;

      await sendToWs(socket, {
        e: "file_read_started",
        message: `Reading file: ${filePath}`,
        filepath: filePath,
      });

      try {
        const readCommand = `
        with open("${fullPath}", "r", encoding="utf-8") as f:
            print(f.read())
        `;

        const execution = await sandbox.runCode(readCommand);
        const content =
          execution.logs?.stdout.join("\n") || execution.logs || "";

        await sendToWs(socket, {
          e: "file_read",
          message: `Read content from ${filePath}`,
          filepath: filePath,
        });
        return `Content from ${filePath}:\n${content}`;
      } catch (e) {
        console.error(e);
        await sendToWs(socket, {
          e: "file_error",
          message: `Failed to read ${filePath}: ${e}`,
          filepath: filePath,
        });
        return `Failed to read file ${filePath}: ${e}`;
      }
    },
    {
      name: "read",
      description:
        "Read a file beneath /home/user/react-app and return its contents.",
      schema: z.object({
        filePath: z
          .string()
          .describe(`Path like "src/App.tsx" or "package.json"`),
      }),
    }
  );

export const delete_file = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { filePath } = z.object({ filePath: z.string() }).parse(input);
      const fullPath = `${APP_ROOT}/${filePath.replace(/^\/+/, "")}`;

      await sendToWs(socket, {
        e: "file_deletion_started",
        message: `Deleting file: ${filePath}`,
        filepath: filePath,
      });
      try {
        const deleteCommand = `
import os
if os.path.exists("${fullPath}"):
    os.remove("${fullPath}")
    print(f"File {${filePath}} deleted successfully")
else:
    print(f"File {${filePath}} does not exist")
`;

        const execution = await sandbox.runCode(deleteCommand);

        await sendToWs(socket, {
          e: "file_deleted",
          message: `Deleted ${filePath}`,
          filepath: filePath,
        });

        return `File ${filePath} deleted successfully.`;
      } catch (e) {
        console.error(e);
        await sendToWs(socket, {
          e: "file_error",
          message: `Failed to delete ${filePath}: ${e}`,
          filepath: filePath,
        });
        return `Failed to delete file ${filePath}: ${e}`;
      }
    },
    {
      name: "delete-file",
      description: "Delete a file beneath /home/user/react-app.",
      schema: z.object({
        filePath: z.string().describe(`Path like "src/old-component.tsx"`),
      }),
    }
  );

export const execute_command = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { command } = z.object({ command: z.string().min(1) }).parse(input);

      await sendToWs(socket, {
        e: "command_started",
        command: command,
      });

      try {
        const execCommand = `
        import subprocess
        import sys
        
        result = subprocess.run(
            "${command}",
            shell=True,
            cwd="${APP_ROOT}",
            capture_output=True,
            text=True
        )
        
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr, file=sys.stderr)
        print("EXIT_CODE:", result.returncode)
        sys.exit(result.returncode)
        `;

        const execution = await sandbox.runCode(execCommand);

        const stdout = execution.logs?.stdout || [];
        const stderr = execution.logs?.stderr || [];
        const exitCode = execution.error ? 1 : 0;

        await sendToWs(socket, {
          e: "command_output",
          command: command,
          stdout: stdout,
          stderr: stderr,
          exit_code: exitCode,
        });

        if (exitCode === 0) {
          await sendToWs(socket, {
            e: "command_executed",
            command: command,
            message: "Command executed successfully",
          });
          return `Command '${command}' executed successfully. Output: ${stdout.join("\n").slice(0, 500)}${stdout.join("\n").length > 500 ? "..." : ""}`;
        } else {
          await sendToWs(socket, {
            e: "command_failed",
            command: command,
            message: `Command failed with exit code ${exitCode}`,
          });
          return `Command '${command}' failed with exit code ${exitCode}. Error: ${stderr.join("\n").slice(0, 500)}${stderr.join("\n").length > 500 ? "..." : ""}`;
        }
      } catch (e) {
        console.error(e);
        await sendToWs(socket, {
          e: "command_error",
          command: command,
          message: `Command execution error: ${e}`,
        });
        return `Command '${command}' failed with error: ${e}`;
      }
    },
    {
      name: "execute-command",
      description:
        "Execute a shell command in /home/user/react-app (e.g., npm install, npm run build). Returns stdout/stderr",
      schema: z.object({
        command: z.string().describe("The shell command to run"),
      }),
    }
  );

export const rename_file = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { oldPath, newPath } = z
        .object({ oldPath: z.string(), newPath: z.string() })
        .parse(input);

      const oldFullPath = `${APP_ROOT}/${oldPath.replace(/^\/+/, "")}`;
      const newFullPath = `${APP_ROOT}/${newPath.replace(/^\/+/, "")}`;

      await sendToWs(socket, {
        e: "file_rename_started",
        message: `Renaming ${oldPath} to ${newPath}`,
        oldPath: oldPath,
        newPath: newPath,
      });

      try {
        const renameCommand = `
        import os
        os.makedirs(os.path.dirname("${newFullPath}"), exist_ok=True)
        if os.path.exists("${oldFullPath}"):
            os.rename("${oldFullPath}", "${newFullPath}")
            print(f"File renamed from {${oldPath}} to {${newPath}}")
        else:
            print(f"File {${oldPath}} does not exist")
        `;

        const execution = await sandbox.runCode(renameCommand);

        await sendToWs(socket, {
          e: "file_renamed",
          message: `Renamed ${oldPath} to ${newPath}`,
          oldPath: oldPath,
          newPath: newPath,
        });

        return `File renamed from ${oldPath} to ${newPath}`;
      } catch (e) {
        console.error(e);
        await sendToWs(socket, {
          e: "file_error",
          message: `Failed to rename ${oldPath} to ${newPath}: ${e}`,
          oldPath: oldPath,
          newPath: newPath,
        });
        return `Failed to rename file: ${e}`;
      }
    },
    {
      name: "rename-file",
      description: "Rename a file beneath /home/user/react-app.",
      schema: z.object({
        oldPath: z.string().describe("The old path of the file"),
        newPath: z.string().describe("The new path of the file"),
      }),
    }
  );

export const list_directories = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { path } = z.object({ path: z.string().default(".") }).parse(input);
      const cmd = `tree -I 'node_modules|.*' ${path}`;

      await sendToWs(socket, {
        e: "command_started",
        command: cmd,
      });
      try {
        const treeCommand = `
        import subprocess
        import os
        
        result = subprocess.run(
            "${cmd}",
            shell=True,
            cwd="${APP_ROOT}",
            capture_output=True,
            text=True
        )
        
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        `;
        const execution = await sandbox.runCode(treeCommand);
        const output =
          execution.logs?.stdout.join("\n") || execution.logs || "";

        await sendToWs(socket, {
          e: "command_output",
          command: cmd,
          stdout: (output as string).split("\n") || [],
          stderr: [],
          exit_code: 0,
        });

        await sendToWs(socket, {
          e: "command_executed",
          command: cmd,
          message: "Directory structure listed successfully",
        });

        return `Directory structure:\n${output}`;
      } catch (e) {
        console.error(e);
        await sendToWs(socket, {
          e: "command_error",
          command: cmd,
          message: `Command execution error: ${e}`,
        });
        return `Failed to list directory structure: ${e}`;
      }
    },
    {
      name: "list-directories",
      description:
        "List a directory (tree) under /home/user/react-app, excluding node_modules, dist, target files or hidden files.",
      schema: z.object({
        path: z.string().default(".").describe('Relative path like ".", "src"'),
      }),
    }
  );

export const get_context = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async () => {
      if (!projectId) return "no project id is available";
      try {
      } catch (e) {
        console.error(e);
      }
    },
    {
      name: "like-get_context",
      description:
        "Fetch the last saved context (semantic/procedural/episodic + files created + recent conversation).",
      schema: z.object({}),
    }
  );

export const save_context = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { semantic, procedural, episodic } = z
        .object({
          semantic: z.string().default(""),
          procedural: z.string().default(""),
          episodic: z.string().default(""),
        })
        .parse(input);

      if (!projectId) return "no project id is available";

      try {
      } catch (e) {}
    },
    {
      name: "save_context",
      description:
        "Save project context (what it is, how it works, what has been done) for continuity across sessions.",
      schema: z.object({
        semantic: z.string().describe("What the project is about").default(""),
        procedural: z.string().describe("How the project works").default(""),
        episodic: z.string().describe("What has been done so far").default(""),
      }),
    }
  );

export const test_build = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async () => {
      const path = APP_ROOT;
      try {
      } catch (e) {
        console.error(e);
      }
    },
    {
      name: "test-build",
      description:
        "Run npm install (if needed) and npm run build in /home/user/react-app to validate the app compiles.",
      schema: z.object({}),
    }
  );

export const write_mutiple_files = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async (input) => {
      const { files } = z
        .object({
          files: z
            .array(
              z.object({
                path: z.string(),
                data: z.string(),
              })
            )
            .min(1),
        })
        .parse(input);

      try {
      } catch (e) {}
    },
    {
      name: "write-multiple-files",
      description:
        "Create many files in one shot under /home/user/react-app for efficiency.",
      schema: z.object({
        files: z
          .array(
            z.object({
              path: z.string().describe("Relative, path (e.g., src/App.jsx)"),
              data: z.string().describe("File contents"),
            })
          )
          .min(1),
      }),
    }
  );

export const check_missing_dependencies = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async () => {
      try {
      } catch (e) {
        console.error(e);
      }
    },
    {
      name: "check-missing-dependencies",
      description:
        "Scan source imports vs package.json and suggest npm install commands for missing dependencies.",
      schema: z.object({}),
    }
  );

export const hello_world = (
  sandbox: Sandbox,
  socket: WebSocket | null,
  projectId: string
) =>
  tool(
    async () => {
      return "Hello, world!";
    },
    {
      name: "hello-world",
      description: "Say hello to the world.",
      schema: z.object({}),
    }
  );
