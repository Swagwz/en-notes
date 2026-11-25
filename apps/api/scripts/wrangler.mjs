import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const apiDirectory = fileURLToPath(new URL("../", import.meta.url));
const wranglerCli = resolve(apiDirectory, "node_modules/wrangler/bin/wrangler.js");
const args = process.argv.slice(2);
const usesLocalState = args[0] === "dev" || args.includes("--local");

if (usesLocalState && !args.includes("--persist-to")) {
  const defaultState = join(apiDirectory, ".wrangler", "state");
  const statePath = Array.from(defaultState).some(
    (character) => (character.codePointAt(0) ?? 0) > 0x7f,
  )
    ? join(tmpdir(), "en-notes-api-d1")
    : defaultState;
  args.push("--persist-to", statePath);
}

const child = spawn(process.execPath, [wranglerCli, ...args], { stdio: "inherit" });
child.on("error", (error) => {
  console.error("Failed to start Wrangler:", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
