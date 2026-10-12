import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
import { preview, chromium } from "./browser-lib.mjs";
await mkdir("evidence", { recursive: true });
const host = await preview();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const report = {
  seed: "POND-1985",
  method:
    "Production bundle, test-response instrumentation only exposes a reference. Read-only bot dispatches keyboard events. Playwright virtual clock accelerates requestAnimationFrame; no game-state mutations, no direct update calls, no invincibility or warping.",
  stages: [],
  errors: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.route("**/assets/index-*.js", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "const game = new Game();",
      "const game = new Game(); globalThis.__qaGame = game;",
    );
    await route.fulfill({ response, body });
  });
  await page.clock.install({ time: new Date("2026-10-12T00:00:00Z") });
  await page.goto(host.url + "/arcade/odyssey/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-action=seed]").click();
  await page.locator("#seed-input").fill("POND-1985");
  await page.locator("#seed-form button[type=submit]").click();
  await page.clock.pauseAt(new Date("2026-10-12T00:00:10Z"));
  await page.evaluate(() => {
    let jumpFrames = 0;
    const down = new Set();
    window.__qaTrace = [];
    const send = (code, pressed) => {
      if (pressed && !down.has(code)) {
        dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
        down.add(code);
      }
      if (!pressed && down.has(code)) {
        dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
        down.delete(code);
      }
    };
    window.__qaBot = setInterval(() => {
      const g = __qaGame,
        p = g.player,
        l = g.level;
      if (g.mode === "clear") {
        if (!__qaTrace.some((s) => s.index === g.index))
          __qaTrace.push({
            index: g.index,
            score: g.score,
            lives: g.lives,
            stageTime: g.levelElapsed,
          });
        for (const code of [...down]) send(code, false);
        document.querySelector("[data-action=next]")?.click();
        jumpFrames = 0;
        return;
      }
      if (g.mode !== "playing") {
        for (const code of [...down]) send(code, false);
        return;
      }
      if (p.grounded && g.lastJump) jumpFrames = 0;
      let right = true,
        left = false,
        run = true;
      const boss = l.boss;
      if (boss && boss.hp > 0 && p.x > boss.home - 260) {
        const delta = boss.x + boss.w / 2 - p.w / 2 - p.x;
        run = false;
        right = delta > 10;
        left = delta < -10;
        if (p.grounded && !g.lastJump && Math.abs(delta) < 200) jumpFrames = 35;
      } else {
        const ahead = p.x + p.w;
        const gap =
          !l.tiles.has(`${Math.floor((ahead + 42) / 32)},15`) ||
          !l.tiles.has(`${Math.floor((ahead + 62) / 32)},15`);
        const enemy = l.enemies.find(
          (e) =>
            e.alive &&
            e.x + e.w > p.x - 20 &&
            e.x - ahead < 90 &&
            e.x > p.x - 20,
        );
        if (p.grounded && !g.lastJump && (gap || enemy)) jumpFrames = 35;
      }
      send("ArrowRight", right);
      send("ArrowLeft", left);
      send("ShiftLeft", run);
      send("Space", jumpFrames > 0);
      if (jumpFrames > 0) jumpFrames--;
    }, 1000 / 60);
  });
  let priorWorld = -1;
  for (let chunk = 0; chunk < 45; chunk++) {
    await page.clock.runFor(10000);
    const s = await page.evaluate(() => ({
      mode: __qaGame.mode,
      index: __qaGame.index,
      x: Math.round(__qaGame.player.x),
      y: Math.round(__qaGame.player.y),
      lives: __qaGame.lives,
      score: __qaGame.score,
      elapsed: __qaGame.elapsed,
      boss: __qaGame.level.boss?.hp,
      stages: __qaTrace,
    }));
    console.log("PLAY", JSON.stringify(s));
    if (Math.floor(s.index / 2) !== priorWorld && s.index > 0) {
      priorWorld = Math.floor(s.index / 2);
      await page.screenshot({
        path: `evidence/world-${priorWorld + 1}.png`,
        fullPage: true,
      });
    }
    if (s.mode === "victory" || s.mode === "gameover") {
      report.result = s;
      report.stages = s.stages;
      await page.screenshot({
        path: `evidence/campaign-${s.mode}.png`,
        fullPage: true,
      });
      break;
    }
  }
  assert.equal(report.result?.mode, "victory");
  assert.equal(report.errors.length, 0);
  report.status = "passed";
  await page.evaluate(() => {
    clearInterval(__qaBot);
    document.querySelector("[data-action=retry]").click();
  });
  await page.clock.runFor(100);
  assert.equal(await page.evaluate(() => __qaGame.index), 0);
  assert.equal(await page.evaluate(() => __qaGame.lives), 3);
  report.replay = "passed";
} catch (e) {
  report.status = "failed";
  report.failure = String(e.stack || e);
  console.error(e);
  process.exitCode = 1;
} finally {
  await writeFile(
    "evidence/playthrough-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  await host.close();
}
