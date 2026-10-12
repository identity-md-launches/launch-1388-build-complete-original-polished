// Rebuilds the source in a fresh directory outside the repository, from the
// committed lockfile, and compares the result with the committed dist/ export.
// Usage: node scripts/check-rebuild.mjs [scratch-dir]
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const scratch = process.argv[2] || (await mkdtemp(join(tmpdir(), "pepe-rebuild-")));
const report = { scratch, steps: [], files: [] };
async function hashes(root, dir = root) {
  const out = {};
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    if ((await stat(path)).isDirectory())
      Object.assign(out, await hashes(root, path));
    else
      out[relative(root, path)] = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
  }
  return out;
}
function run(label, cmd, args, cwd) {
  const started = Date.now();
  const output = execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "1" },
  });
  report.steps.push({
    label,
    command: [cmd, ...args].join(" "),
    seconds: (Date.now() - started) / 1000,
    tail: output.trim().split("\n").slice(-3),
  });
}
await mkdir("evidence", { recursive: true });
try {
  await rm(scratch, { recursive: true, force: true });
  await cp("web", join(scratch, "web"), {
    recursive: true,
    filter: (src) => !src.includes("node_modules"),
  });
  run("install from lockfile", "npm", ["ci", "--no-audit", "--no-fund"], join(scratch, "web"));
  run("typecheck", "npm", ["run", "typecheck"], join(scratch, "web"));
  run("build", "npm", ["run", "build"], join(scratch, "web"));
  const committed = await hashes("dist");
  const rebuilt = await hashes(join(scratch, "dist"));
  const names = [...new Set([...Object.keys(committed), ...Object.keys(rebuilt)])].sort();
  for (const name of names)
    report.files.push({
      file: "dist/" + name,
      committed: committed[name] || null,
      rebuilt: rebuilt[name] || null,
      identical: committed[name] === rebuilt[name],
    });
  report.identical = report.files.every((f) => f.identical);
  report.status = report.identical ? "passed" : "failed";
  if (!report.identical) process.exitCode = 1;
} catch (error) {
  report.status = "failed";
  report.failure = String(error.stderr || error.stack || error);
  process.exitCode = 1;
} finally {
  await writeFile(
    "evidence/rebuild-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}
