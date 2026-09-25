import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
const packageDirs = (await readdir(join(root, "packages"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(root, "packages", entry.name));
const testRoots = [...packageDirs.map((dir) => join(dir, "test")), join(root, "tools", "test")];
const files = [];
for (const testDir of testRoots) {
  try {
    for (const entry of await readdir(testDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".test.mjs")) files.push(join(testDir, entry.name));
    }
  } catch {
    // Directories without tests are valid.
  }
}
const args = process.argv.slice(2);
const selected = args.length ? files.filter((file) => args.some((arg) => file.includes(arg))) : files;
if (selected.length === 0) {
  console.error("No Node tests matched.");
  process.exit(1);
}
const child = spawn(process.execPath, ["--test", ...selected], { stdio: "inherit", cwd: root });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
