import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { preview, chromium } from "./browser-lib.mjs";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const host = await preview(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const report = {
  checks: [],
  screenshots: [],
  method:
    "Production bundle exposed only in the intercepted test response. Fixed state setup for power-ups, secret pipe and boss portraits; inputs and collisions use the real game loop.",
};
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.route("**/assets/index-*.js", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(
        "const game = new Game();",
        "const game = new Game(); globalThis.__qaGame = game;",
      ),
    });
  });
  await page.clock.install({ time: new Date("2026-10-12T00:00:00Z") });
  await page.goto(host.url + "/arcade/odyssey/");
  await page.locator("[data-action=new]").click();
  await page.clock.pauseAt(new Date("2026-10-12T00:00:10Z"));
  await page.keyboard.press("Space");
  await page.clock.runFor(50);
  assert.ok(await page.evaluate(() => __qaGame.player.vy < 0));
  report.checks.push(
    "Sub-frame jump press is retained until the next physics update.",
  );
  await page.clock.runFor(1000);
  await page.evaluate(() => __qaGame.collectPower("fire"));
  await page.keyboard.press("x");
  await page.clock.runFor(50);
  assert.ok(await page.evaluate(() => __qaGame.shots.some((s) => !s.hostile)));
  report.checks.push("Sub-frame X press emits a fireball.");
  await page.clock.runFor(400);
  await page.locator("[data-control=fire]").tap({ force: true });
  await page.clock.runFor(50);
  assert.ok(await page.evaluate(() => __qaGame.shotTimer > 0.2));
  report.checks.push("Touch Fire tap emits a fireball.");
  await page.evaluate(() => {
    __qaGame.player.x = __qaGame.level.pipe;
    __qaGame.player.y = 480 - __qaGame.player.h;
    __qaGame.player.vx = 0;
    __qaGame.player.vy = 0;
    __qaGame.player.grounded = true;
  });
  await page.keyboard.press("ArrowDown");
  await page.clock.runFor(100);
  assert.equal(await page.evaluate(() => __qaGame.level.bonus), true);
  await page.screenshot({ path: "artifacts/bonus-cave.png", fullPage: true });
  report.screenshots.push("artifacts/bonus-cave.png");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Shift");
  await page.keyboard.down("Space");
  await page.clock.runFor(350);
  await page.keyboard.up("Space");
  for (let i = 0; i < 60; i++) {
    await page.clock.runFor(100);
    if (!(await page.evaluate(() => __qaGame.level.bonus))) break;
  }
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Shift");
  assert.equal(await page.evaluate(() => __qaGame.level.bonus), false);
  assert.equal(await page.evaluate(() => __qaGame.bonusVisited), true);
  report.checks.push(
    "S/Down enters the pipe; keyboard traversal reaches the bonus exit and restores the main level.",
  );
  for (const index of [1, 3, 5, 7]) {
    await page.evaluate((i) => {
      __qaGame.index = i;
      __qaGame.loadLevel();
      __qaGame.player.x = __qaGame.level.checkpoints.at(-1);
      __qaGame.player.invulnerable = 2;
    }, index);
    await page.clock.runFor(650);
    await page.screenshot({
      path: `artifacts/boss-${(index + 1) / 2}.png`,
      fullPage: true,
    });
    report.screenshots.push(`artifacts/boss-${(index + 1) / 2}.png`);
  }
  report.checks.push(
    "All four guardian portraits rendered at their real arenas.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#pause").click({ force: true });
  await page.clock.runFor(100);
  await page.evaluate(() => {
    document.querySelector("[data-action=restart]").click();
  });
  await page.locator("#confirm-restart").click({ force: true });
  await page.clock.runFor(100);
  await page.evaluate(() => {
    __qaGame.seed = "ABCDEFGHIJKLMNOPQRST";
  });
  await page.clock.runFor(150);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const seedBox = await page.locator("#seed-display").boundingBox();
  assert.ok(seedBox.x + seedBox.width <= 390);
  report.checks.push("A 20-character seed stays visible at 390px.");
  report.status = "passed";
} catch (e) {
  report.status = "failed";
  report.failure = String(e.stack || e);
  console.error(e);
  process.exitCode = 1;
} finally {
  await writeFile(
    "artifacts/mechanics-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  await host.close();
}
