#!/usr/bin/env node
/**
 * Free ASSISTANT_PORT (default 8787) then start assistant-server with --watch.
 */
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.ASSISTANT_PORT || "8787";

function freePort(p) {
  try {
    const out = execSync(`lsof -tiTCP:${p} -sTCP:LISTEN`, {
      encoding: "utf8",
    }).trim();
    if (!out) return;
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // ignore
      }
    }
    try {
      execSync("sleep 0.4");
    } catch {
      // ignore
    }
  } catch {
    // nothing listening
  }
}

freePort(port);

const child = spawn(
  process.execPath,
  ["--watch", "assistant-server/server.mjs"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ASSISTANT_HOST: process.env.ASSISTANT_HOST || "127.0.0.1",
      ASSISTANT_PORT: port,
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
