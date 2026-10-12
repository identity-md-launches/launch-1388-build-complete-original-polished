import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile("dist/pepe-game.json", "utf8"));
const allowed = [
  "schemaVersion",
  "title",
  "version",
  "summary",
  "description",
  "controls",
  "genre",
  "players",
  "mobile",
  "entry",
  "cover",
];
assert.deepEqual(Object.keys(manifest).sort(), allowed.sort());
assert.equal(manifest.schemaVersion, "pepe-browser-game/1");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
for (const [key, min, max] of [
  ["title", 2, 60],
  ["summary", 10, 160],
  ["description", 10, 2000],
  ["controls", 5, 500],
]) {
  assert.equal(typeof manifest[key], "string");
  assert.ok(manifest[key].length >= min && manifest[key].length <= max, key);
}
assert.ok(
  ["arcade", "puzzle", "action", "strategy", "casual"].includes(manifest.genre),
);
assert.equal(manifest.players, 1);
assert.equal(manifest.mobile, true);
for (const key of ["entry", "cover"]) {
  assert.match(manifest[key], /^[a-zA-Z0-9_-]+\.(html|svg|png|jpe?g|webp)$/);
  assert.ok((await stat("dist/" + manifest[key])).size > 0);
}
const html = await readFile("dist/index.html", "utf8");
for (const token of [
  "<title>",
  'name="description"',
  'property="og:title"',
  'property="og:image"',
  'rel="icon"',
])
  assert.ok(html.includes(token), token);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (ref.startsWith("#")) continue;
  assert.ok(ref.startsWith("./"), `Non-relative URL ${ref}`);
  assert.ok((await stat("dist/" + ref.slice(2))).size > 0);
}
assert.ok(html.includes("<script defer"));
assert.ok(!html.includes('type="module"'));
const exportFiles = [];
async function files(dir) {
  let out = [];
  for (const name of await readdir(dir)) {
    assert.notEqual(name, "node_modules");
    assert.notEqual(name, ".git");
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) out.push(...(await files(path)));
    else out.push(path);
  }
  return out;
}
for (const path of await files("dist")) {
  const bytes = await readFile(path);
  exportFiles.push({
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  if (path.endsWith(".js")) {
    assert.ok(
      !bytes.toString().includes("__qaGame"),
      "QA instrumentation leaked into export",
    );
    assert.ok(!bytes.toString().includes("https://"), "Remote runtime URL");
  }
}
const cover = await readFile("dist/cover.svg", "utf8");
assert.match(cover, /width="1200" height="630"/);
assert.ok(!/href="https?:/.test(cover));
let bundleBytes = 0;
const included = [];
for (const root of ["web", "dist", "tests", "scripts", "artifacts", "licenses"])
  for (const path of await files(root)) {
    bundleBytes += (await stat(path)).size;
    included.push(path);
  }
for (const path of ["README.md", "DESIGN.md", "ASSETS.md"]) {
  try {
    bundleBytes += (await stat(path)).size;
    included.push(path);
  } catch {}
}
assert.ok(bundleBytes < 8388608, `Bundle exceeds 8 MiB: ${bundleBytes}`);
const report = {
  status: "passed",
  manifest:
    "pepe-browser-game/1 fields validated against the published integration contract",
  exportBytes: exportFiles.reduce((n, f) => n + f.bytes, 0),
  bundleBytes,
  bundleLimit: 8388608,
  exportFiles,
  includedFiles: included.length,
  note: "Counts delivery directories and documentation. .imd inputs and test/scratch are removed by the worker. No Git metadata was read or changed. No ignore file was changed. All npm installations occurred outside the repository.",
};
await writeFile(
  "artifacts/export-check.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
