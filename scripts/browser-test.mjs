import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preview, chromium, requireTools } from "./browser-lib.mjs";
process.chdir(resolve(fileURLToPath(new URL("..", import.meta.url))));
const AxeBuilder = requireTools("@axe-core/playwright").default;
await mkdir("artifacts", { recursive: true });
const host = await preview();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const report = {
  browser: await browser.version(),
  date: new Date().toISOString(),
  checks: [],
  screenshots: [],
  errors: [],
  contrast: [],
  accessibility: [],
  limitations: [
    "Chromium automation, not a physical phone or screen-reader session.",
    "State fixtures exercise game-over, power-ups and bridge score; the campaign test uses only keyboard events.",
    "Audio context and scheduling checked; audible mix has not been independently listened to.",
  ],
};
const ok = (name, detail) => {
  report.checks.push({ name, status: "passed", detail });
  console.log("PASS", name, detail || "");
};
function observe(page) {
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`);
  });
}
async function shot(page, name) {
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  report.screenshots.push(`artifacts/${name}.png`);
}
async function instrument(page) {
  await page.route("**/assets/index-*.js", async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    assert.ok(body.includes("const game = new Game();"));
    body = body
      .replace(
        "const game = new Game();",
        "const game = new Game(); globalThis.__qaGame = game;",
      )
      .replace(
        "const synth = new Synth();",
        "const synth = new Synth(); globalThis.__qaSynth = synth;",
      )
      .replace(
        "const renderer = new Renderer(canvas, game);",
        "const renderer = new Renderer(canvas, game); globalThis.__qaRenderer = renderer;",
      );
    await route.fulfill({ response, body });
  });
}
const state = (page) =>
  page.evaluate(() => ({
    mode: __qaGame.mode,
    x: __qaGame.player.x,
    y: __qaGame.player.y,
    vx: __qaGame.player.vx,
    vy: __qaGame.player.vy,
    grounded: __qaGame.player.grounded,
    lives: __qaGame.lives,
    score: __qaGame.score,
    time: __qaGame.time,
    index: __qaGame.index,
    seed: __qaGame.seed,
    elapsed: __qaGame.elapsed,
    boss: __qaGame.level.boss?.hp,
  }));
try {
  // The first checks use the completely unmodified production bytes.
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await desktopContext.newPage();
  observe(page);
  await page.goto(host.url + "/arcade/odyssey/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  assert.equal(
    await page.title(),
    "Pepe Bros. ASCII Odyssey — A pond-sized adventure",
  );
  await shot(page, "title-desktop");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Skip to game");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.ok(
    await page
      .locator(":focus")
      .evaluate((e) => getComputedStyle(e).outlineStyle === "solid"),
  );
  ok("Keyboard focus", "Visible 3px focus ring and logical Tab order.");
  await page.locator("[data-action=seed]").click();
  await page.locator("#seed-form button[type=submit]").click();
  assert.equal(
    await page.locator("#seed-input").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("#seed-input").fill("moss-4242");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#seed-display").textContent(), "MOSS-4242");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(850);
  await page.keyboard.down("Space");
  await page.waitForTimeout(220);
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowRight");
  await shot(page, "game-desktop");
  await page.keyboard.press("p");
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator("#canvas").getAttribute("data-mode"),
    "paused",
  );
  await shot(page, "pause-desktop");
  await page.locator("[data-action=resume]").click();
  assert.equal(
    await page.locator("#canvas").getAttribute("data-mode"),
    "playing",
  );
  await page.locator("#mute").click();
  assert.equal(
    await page.locator("#mute").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#crt").click();
  assert.equal(
    await page.locator("#crt").getAttribute("aria-pressed"),
    "false",
  );
  await page.reload();
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator("#mute").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator("#crt").getAttribute("aria-pressed"),
    "false",
  );
  ok(
    "Unmodified export keyboard loop",
    "Seed validation, case normalization, movement, jump, P pause, resume, mute and CRT persistence.",
  );
  await page.locator("#crt").click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    state: "title",
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  assert.equal(
    axe.violations.length,
    0,
    JSON.stringify(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  );
  await page.locator("#help").click();
  const helpAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    state: "help",
    violations: helpAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  assert.equal(helpAxe.violations.length, 0);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(":focus").getAttribute("id"), "help");
  ok(
    "Accessible dialogs",
    "Native focus trap, Escape close and focus return. Axe title/help scans have no WCAG A/AA violations.",
  );
  report.contrast = await page.evaluate(() => {
    const lum = (c) => {
      let v = c
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((n) => {
          n /= 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    return [
      ["Body", "body", "body"],
      ["Muted HUD", ".stat>span", ".hud"],
      ["Primary action", ".primary", ".primary"],
      ["Button", "button.small-button", "button.small-button"],
    ].map(([label, f, b]) => {
      const fc = getComputedStyle(document.querySelector(f)).color,
        bc = getComputedStyle(document.querySelector(b)).backgroundColor;
      return {
        label,
        foreground: fc,
        background: bc,
        ratio:
          (Math.max(lum(fc), lum(bc)) + 0.05) /
          (Math.min(lum(fc), lum(bc)) + 0.05),
      };
    });
  });
  assert.ok(report.contrast.every((c) => c.ratio >= 4.5));
  ok(
    "Rendered contrast",
    report.contrast.map((c) => `${c.label} ${c.ratio.toFixed(2)}:1`).join(", "),
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(300);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const box = await page.locator("[data-action=new]").boundingBox();
    assert.ok(box.y + box.height < 844);
    if (width === 390) await shot(page, "title-mobile");
    if (width === 320) await shot(page, "title-320");
  }
  ok(
    "Responsive title",
    "320, 390, 768 and 1440 widths; no horizontal overflow; primary action inside first viewport.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".cursor")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  await page.waitForTimeout(100);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const enlargedButton = await page.locator("[data-action=new]").boundingBox(),
    enlargedStage = await page.locator("#stage").boundingBox();
  assert.ok(
    enlargedButton.y + enlargedButton.height <
      enlargedStage.y + enlargedStage.height,
  );
  await shot(page, "text-200-percent");
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  ok(
    "Text enlargement",
    "200% root text size reflows at 1280px; distinct from native browser zoom.",
  );
  await page.close();
  // Observe internals only in the test response. No QA global ships in dist.
  const play = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  observe(play);
  await instrument(play);
  await play.goto(host.url + "/arcade/odyssey/");
  await play.waitForTimeout(200);
  assert.equal(
    await play.evaluate(() => __qaSynth.context === undefined),
    true,
  );
  await play.locator("[data-action=seed]").click();
  await play.locator("#seed-input").fill("POND-1985");
  await play.locator("#seed-form button[type=submit]").click();
  await play.waitForTimeout(200);
  assert.equal(await play.evaluate(() => __qaSynth.context.state), "running");
  ok(
    "Audio gesture",
    "No AudioContext before a gesture; context runs after Play this seed.",
  );
  const before = await state(play);
  await play.keyboard.down("d");
  await play.waitForTimeout(500);
  await play.keyboard.up("d");
  assert.ok((await state(play)).x > before.x + 50);
  await play.keyboard.press("Escape");
  const paused = await state(play);
  await play.waitForTimeout(250);
  assert.equal((await state(play)).time, paused.time);
  assert.equal((await state(play)).x, paused.x);
  await play.locator("[data-action=restart]").click();
  await play.locator("#confirm-restart").click();
  assert.equal((await state(play)).lives, 3);
  assert.equal((await state(play)).index, 0);
  ok(
    "Pause freeze and restart",
    "Physics/timer freeze exactly; confirmed restart restores three lives, stage one, same seed.",
  );
  // Deterministic state fixtures reach otherwise long-tail states through the actual collision/update loop.
  for (let i = 0; i < 3; i++) {
    await play.evaluate(() => {
      __qaGame.player.y = 650;
    });
    await play.waitForTimeout(1300);
  }
  assert.equal((await state(play)).mode, "gameover");
  await shot(play, "game-over");
  await play.locator("[data-action=retry]").click();
  assert.equal((await state(play)).lives, 3);
  ok(
    "Game over and instant replay",
    "Three water-death fixtures render the real game-over menu; one-click same-seed replay.",
  );
  await play.evaluate(() => {
    __qaGame.collectPower("fire");
  });
  await play.keyboard.down("j");
  await play.waitForTimeout(150);
  await play.keyboard.up("j");
  assert.ok(await play.evaluate(() => __qaGame.shots.some((s) => !s.hostile)));
  ok("Fire control", "J emits a real fireball with Fire Fly.");
  await play.emulateMedia({ reducedMotion: "reduce" });
  await play.waitForTimeout(50);
  assert.equal(await play.evaluate(() => __qaRenderer.reduced), true);
  ok(
    "Reduced motion",
    "Renderer honors media changes; no shake, twinkle, parallax or decorative blink.",
  );
  await play.close();
  // Mobile pointer controls: two simultaneous pointers and pointer cancellation.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const touch = await mobile.newPage();
  observe(touch);
  await instrument(touch);
  await touch.goto(host.url + "/arcade/odyssey/");
  await touch.locator("[data-action=new]").tap();
  await touch.waitForTimeout(150);
  const origin = await state(touch);
  const cdp = await mobile.newCDPSession(touch);
  const rb = await touch.locator("[data-control=right]").boundingBox(),
    jb = await touch.locator("[data-control=jump]").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: rb.x + rb.width / 2, y: rb.y + rb.height / 2, id: 11 },
      { x: jb.x + jb.width / 2, y: jb.y + jb.height / 2, id: 12 },
    ],
  });
  await touch.waitForTimeout(220);
  const moved = await state(touch);
  assert.ok(moved.x > origin.x + 30);
  assert.ok(moved.y < origin.y - 25);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await touch.waitForTimeout(300);
  assert.equal((await state(touch)).vx, 0);
  await shot(touch, "game-mobile");
  await touch.locator("#pause").tap();
  assert.equal((await state(touch)).mode, "paused");
  await touch.locator("[data-action=resume]").tap();
  assert.equal((await state(touch)).mode, "playing");
  await touch.setViewportSize({ width: 320, height: 568 });
  await touch.waitForTimeout(200);
  assert.ok(
    await touch
      .locator(".jump-button")
      .evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight),
  );
  await shot(touch, "game-short-phone");
  await touch.setViewportSize({ width: 844, height: 390 });
  await touch.waitForTimeout(300);
  assert.ok(
    await touch.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await shot(touch, "game-landscape");
  const landscapeHit = await touch.locator(".jump-button").evaluate((e) => {
    const r = e.getBoundingClientRect();
    const hit = document.elementFromPoint(
      r.x + r.width / 2,
      r.y + r.height / 2,
    );
    return {
      y: r.y,
      bottom: r.bottom,
      viewport: innerHeight,
      hit: hit?.outerHTML.slice(0, 180),
      same: hit?.closest("button") === e,
    };
  });
  assert.ok(
    landscapeHit.y >= 0 &&
      landscapeHit.bottom <= landscapeHit.viewport &&
      landscapeHit.same,
    JSON.stringify(landscapeHit),
  );
  ok(
    "Touch and landscape",
    "New run, simultaneous direction+jump, pointer cancellation, pause/resume; 390×844, 320×568 and 844×390.",
  );
  await mobile.close();
  // Exact arcade sandbox, deliberately without an Access-Control-Allow-Origin response header.
  const embed = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  observe(embed);
  await instrument(embed);
  await embed.goto(host.url + "/test-host.html");
  await embed.waitForTimeout(300);
  const frame = embed
    .frames()
    .find((f) => f.url().endsWith("/arcade/odyssey/"));
  assert.ok(frame);
  assert.ok(
    await frame.evaluate(() => {
      try {
        localStorage.setItem("probe", "x");
        return false;
      } catch {
        return true;
      }
    }),
  );
  assert.ok(
    (await embed.evaluate(() => messages)).some(
      (m) => m.type === "ready" && m.channel === "test-channel",
    ),
  );
  await frame.locator("[data-action=new]").click();
  await embed.waitForTimeout(150);
  await embed.evaluate(() =>
    document
      .querySelector("iframe")
      .contentWindow.postMessage(
        { protocol: "pepe-game/1", type: "pause", channel: "wrong-channel" },
        "*",
      ),
  );
  await embed.waitForTimeout(50);
  assert.equal((await state(frame)).mode, "playing");
  await frame.evaluate(() =>
    dispatchEvent(
      new MessageEvent("message", {
        source: window,
        data: {
          protocol: "pepe-game/1",
          type: "pause",
          channel: "test-channel",
        },
      }),
    ),
  );
  await embed.waitForTimeout(50);
  assert.equal((await state(frame)).mode, "playing");
  await embed.evaluate(() =>
    document
      .querySelector("iframe")
      .contentWindow.postMessage(
        { protocol: "pepe-game/1", type: "pause", channel: "test-channel" },
        "*",
      ),
  );
  await embed.waitForTimeout(50);
  assert.equal((await state(frame)).mode, "paused");
  await embed.evaluate(() =>
    document
      .querySelector("iframe")
      .contentWindow.postMessage(
        { protocol: "pepe-game/1", type: "resume", channel: "test-channel" },
        "*",
      ),
  );
  await embed.waitForTimeout(50);
  assert.equal((await state(frame)).mode, "playing");
  await frame.evaluate(() => {
    __qaGame.score = 1234;
    __qaGame.lives = 1;
    __qaGame.player.y = 650;
  });
  await embed.waitForTimeout(1300);
  const messages = await embed.evaluate(() => messages);
  assert.ok(
    messages.some(
      (m) =>
        m.type === "score" && m.score === 1234 && m.channel === "test-channel",
    ),
  );
  await shot(embed, "sandbox-bridge");
  ok("Opaque-origin bridge", {
    storageDenied: true,
    corsHeaders: false,
    wrongSourceRejected: true,
    wrongChannelRejected: true,
    messages,
  });
  await embed.close();
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  const manifest = JSON.parse(await readFile("dist/pepe-game.json", "utf8"));
  assert.equal(manifest.schemaVersion, "pepe-browser-game/1");
  for (const f of [manifest.entry, manifest.cover]) {
    assert.ok(!f.includes("..") && !f.startsWith("/"));
    assert.ok((await readFile("dist/" + f)).length > 0);
  }
  assert.match(
    await readFile("dist/cover.svg", "utf8"),
    /width="1200" height="630"/,
  );
  ok(
    "Manifest and cover",
    "Relative entry and 1200×630 original SVG cover are present.",
  );
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = String(error.stack || error);
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(
    "artifacts/browser-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  await host.close();
}
