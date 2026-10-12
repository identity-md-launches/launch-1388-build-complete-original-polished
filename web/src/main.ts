import "./style.css";
import {
  Game,
  WORLDS,
  emptyInput,
  normalizeSeed,
  randomSeed,
  type Input,
  type Mode,
} from "./engine.ts";
import { Renderer } from "./render.ts";
import { Synth } from "./audio.ts";
import { SafeStore } from "./storage.ts";
import { connectBridge } from "./bridge.ts";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.body.classList.toggle("touch-device", navigator.maxTouchPoints > 0);
const game = new Game();
const store = new SafeStore();
const synth = new Synth();
const canvas = $<HTMLCanvasElement>("canvas");
const renderer = new Renderer(canvas, game);
const panel = $("panel");
const titleMarkup = panel.innerHTML;
const keys = new Set<string>();
const pointers = new Map<number, keyof Input>();
let jumpPressed = false;
let firePressed = false;
let downPressed = false;
const media = matchMedia("(prefers-reduced-motion: reduce)");
let scanlines = store.get("crt", "true") === "true";
let lastMode: Mode = "title";
let displayedMode: Mode | "" = "";
let resumeAfterDialog = false;
let lastHud = 0;
let best = 0;
let hideHintsAt = 0;
synth.setMute(store.get("mute", "false") === "true");
renderer.reduced = media.matches;
media.addEventListener("change", () => {
  renderer.reduced = media.matches;
});

function clearInput() {
  jumpPressed = false;
  firePressed = false;
  downPressed = false;
  keys.clear();
  pointers.clear();
  document
    .querySelectorAll("[data-control]")
    .forEach((b) => b.classList.remove("held"));
}
function pause() {
  // A deliberate pause (button, key or arcade host) outranks a dialog that
  // was opened earlier: closing that dialog must not resume play.
  resumeAfterDialog = false;
  clearInput();
  game.pause();
  sync();
}
function resume() {
  if (document.querySelector("dialog[open]") || document.hidden) return;
  clearInput();
  game.resume();
  sync();
  canvas.focus({ preventScroll: true });
}
const bridge = connectBridge({ pause, resume });
function start(seed: string) {
  void synth.unlock();
  clearInput();
  game.start(seed);
  best = store.best(game.seed);
  displayedMode = "";
  sync();
  canvas.focus({ preventScroll: true });
}
function openDialog(id: string) {
  clearInput();
  resumeAfterDialog = game.mode === "playing";
  if (resumeAfterDialog) game.pause();
  $<HTMLDialogElement>(id).showModal();
  sync();
}
function showTitle() {
  clearInput();
  game.mode = "title";
  game.index = 0;
  displayedMode = "";
  sync();
}
function updateSettings() {
  const mute = $("mute");
  mute.setAttribute("aria-pressed", String(synth.muted));
  mute.setAttribute("aria-label", synth.muted ? "Unmute audio" : "Mute audio");
  mute.innerHTML = `<span aria-hidden="true">${synth.muted ? "♪×" : "♪"}</span><span class="button-word"> ${synth.muted ? "Muted" : "Sound"}</span>`;
  $("crt").setAttribute("aria-pressed", String(scanlines));
  $("stage").classList.toggle("has-scanlines", scanlines);
  $("storage-note").textContent = store.available
    ? "Your best, saved per seed."
    : "Best scores last for this session.";
}
$("mute").addEventListener("click", () => {
  synth.setMute(!synth.muted);
  store.set("mute", String(synth.muted));
  void synth.unlock();
  updateSettings();
});
$("crt").addEventListener("click", () => {
  scanlines = !scanlines;
  store.set("crt", String(scanlines));
  updateSettings();
});
$("pause").addEventListener("click", () => {
  if (game.mode === "paused") resume();
  else pause();
});
$("help").addEventListener("click", () => openDialog("help-dialog"));
$("seed-display").addEventListener("click", () => {
  if (game.mode === "title") {
    openSeed();
    return;
  }
  $<HTMLInputElement>("share-input").value = game.seed;
  $("copy-status").textContent = "";
  openDialog("share-dialog");
  $<HTMLInputElement>("share-input").select();
});
$("copy-seed").addEventListener("click", async () => {
  const field = $<HTMLInputElement>("share-input");
  try {
    await navigator.clipboard.writeText(field.value);
    $("copy-status").textContent = "Seed copied. A new adventure to share.";
  } catch {
    field.focus();
    field.select();
    $("copy-status").textContent =
      "Select the seed above and copy it with your device’s copy command.";
  }
});
$("confirm-restart").addEventListener("click", () => {
  resumeAfterDialog = false;
  $<HTMLDialogElement>("restart-dialog").close();
  start(game.seed);
});
for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog")) {
  dialog
    .querySelectorAll("[data-close]")
    .forEach((button) =>
      button.addEventListener("click", () => dialog.close()),
    );
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    if (resumeAfterDialog) {
      resumeAfterDialog = false;
      resume();
    }
  });
}
function openSeed() {
  $("seed-error").textContent = "";
  $("seed-best").textContent = "";
  $<HTMLInputElement>("seed-input").value = "";
  $("seed-input").removeAttribute("aria-invalid");
  openDialog("seed-dialog");
  $("seed-input").focus();
}
$("seed-input").addEventListener("input", () => {
  const seed = normalizeSeed($<HTMLInputElement>("seed-input").value);
  $("seed-best").textContent = store.best(seed)
    ? `Best on this seed: ${store.best(seed).toLocaleString()}`
    : "";
  $("seed-input").removeAttribute("aria-invalid");
  $("seed-error").textContent = "";
});
$("seed-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const field = $<HTMLInputElement>("seed-input");
  const seed = field.value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,20}$/.test(seed)) {
    field.setAttribute("aria-invalid", "true");
    $("seed-error").textContent =
      "Use 1–20 letters, numbers or hyphens to name your run.";
    field.focus();
    return;
  }
  resumeAfterDialog = false;
  $<HTMLDialogElement>("seed-dialog").close();
  start(seed);
});
panel.addEventListener("click", (event) => {
  const action = (event.target as Element).closest<HTMLButtonElement>(
    "[data-action]",
  )?.dataset.action;
  if (action === "new") start(randomSeed());
  if (action === "seed") openSeed();
  if (action === "resume") {
    void synth.unlock();
    resume();
  }
  if (action === "retry") start(game.seed);
  if (action === "restart") openDialog("restart-dialog");
  if (action === "next") {
    clearInput();
    game.next();
    sync();
    canvas.focus({ preventScroll: true });
  }
  if (action === "title") showTitle();
  if (action === "help") openDialog("help-dialog");
});
const controlledKeys = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "KeyJ",
  "KeyX",
  "ShiftLeft",
  "ShiftRight",
];
window.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    document.querySelector("dialog[open]")
  )
    return;
  if (["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName))
    return;
  if (event.code === "Escape" || event.code === "KeyP") {
    if (event.repeat) return;
    if (game.mode === "playing" || game.mode === "paused") {
      event.preventDefault();
      if (game.mode === "playing") pause();
      else resume();
    }
    return;
  }
  if (controlledKeys.includes(event.code) && game.mode === "playing") {
    event.preventDefault();
    keys.add(event.code);
    if (!event.repeat && ["KeyS", "ArrowDown"].includes(event.code))
      downPressed = true;
    if (!event.repeat && ["Space", "KeyW", "ArrowUp"].includes(event.code))
      jumpPressed = true;
    if (!event.repeat && ["KeyJ", "KeyX"].includes(event.code))
      firePressed = true;
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  clearInput();
  game.pause();
  sync();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
    game.pause();
    sync();
  }
});
canvas.addEventListener("pointerdown", () => {
  void synth.unlock();
  canvas.focus({ preventScroll: true });
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-control]",
)) {
  const control = button.dataset.control as keyof Input;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (game.mode !== "playing") return;
    void synth.unlock();
    pointers.set(event.pointerId, control);
    if (control === "down") downPressed = true;
    if (control === "jump") jumpPressed = true;
    if (control === "fire") firePressed = true;
    button.classList.add("held");
    button.setPointerCapture(event.pointerId);
  });
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (![...pointers.values()].includes(control))
      button.classList.remove("held");
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}
function readInput(): Input {
  const touch = new Set(pointers.values());
  const input = emptyInput();
  input.left = keys.has("KeyA") || keys.has("ArrowLeft") || touch.has("left");
  input.right =
    keys.has("KeyD") || keys.has("ArrowRight") || touch.has("right");
  input.jump =
    keys.has("Space") ||
    keys.has("KeyW") ||
    keys.has("ArrowUp") ||
    touch.has("jump") ||
    jumpPressed;
  input.run =
    keys.has("ShiftLeft") ||
    keys.has("ShiftRight") ||
    touch.has("left") ||
    touch.has("right");
  input.fire =
    keys.has("KeyJ") || keys.has("KeyX") || touch.has("fire") || firePressed;
  input.down =
    keys.has("KeyS") ||
    keys.has("ArrowDown") ||
    touch.has("down") ||
    downPressed;
  jumpPressed = false;
  firePressed = false;
  downPressed = false;
  return input;
}
const stage = $("stage");
const touchControls = document.querySelector<HTMLElement>(".touch-controls")!;
let fitted = "";
// Touch play fits HUD, scene and touch strip into the viewport without
// scrolling: the stage takes the viewport height minus everything above it
// and the measured touch strip below it. CSS decides when to use the value.
function fitStage() {
  const body = document.body.classList;
  let value = "";
  if (body.contains("in-run") && body.contains("touch-device")) {
    const top = stage.getBoundingClientRect().top + scrollY;
    const strip = touchControls.getBoundingClientRect().height;
    value = `${Math.floor(innerHeight - top - strip - 1)}px`;
  }
  if (value === fitted) return;
  fitted = value;
  if (value) stage.style.setProperty("--fit-stage", value);
  else stage.style.removeProperty("--fit-stage");
}
function resultStats() {
  return `<div class="result-stats"><p><strong>${game.score.toLocaleString()}</strong>Score</p><p><strong>${game.totalFlies}</strong>Flies</p><p><strong>${Math.floor(game.elapsed / 60)}:${Math.floor(
    game.elapsed % 60,
  )
    .toString()
    .padStart(2, "0")}</strong>Run time</p></div>`;
}
function sync() {
  const mode = game.mode,
    title = mode === "title";
  document.body.classList.toggle("in-run", !title);
  $("run-title").hidden = title;
  $("pause").hidden = title || !["playing", "paused"].includes(mode);
  $("pause").textContent = mode === "paused" ? "▷" : "Ⅱ";
  $("pause").setAttribute(
    "aria-label",
    mode === "paused" ? "Resume game" : "Pause game",
  );
  panel.hidden = mode === "playing" || mode === "dying";
  if (displayedMode !== mode) {
    displayedMode = mode;
    panel.className = title ? "game-panel title-panel" : "game-panel";
    if (title) panel.innerHTML = titleMarkup;
    if (mode === "paused")
      panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">  z Z\n ( @ )\n /___\\</pre><h2>Pond on pause.</h2><p class="subtitle">Your adventure will keep.</p><div class="center-actions"><button type="button" class="primary" data-action="resume">Resume run <span aria-hidden="true">→</span></button><button type="button" data-action="restart">Restart this seed</button></div><button type="button" class="subtle-action" data-action="help">Read the field guide</button></div>`;
    if (mode === "clear")
      panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">  |>***\n  | >>\n@_|___</pre><h2>${game.index % 2 ? "World" : "Level"} complete.</h2><p class="subtitle">${WORLDS[Math.floor(game.index / 2)].name} ${Math.floor(game.index / 2) + 1}-${(game.index % 2) + 1} / a little closer to the Lily.</p>${resultStats()}<p class="subtitle">Flag +${game.flagBonus} · Time +${game.timeBonus}</p><div class="center-actions"><button type="button" class="primary" data-action="next">Next level →</button></div><p class="run-note">${game.index + 1} of 8 levels complete · ${game.lives} ${game.lives === 1 ? "life" : "lives"} left</p></div>`;
    if (mode === "gameover")
      panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">    .-.\n   ( x )\n ~~~|~~~</pre><h2>The pond remembers.</h2><p class="subtitle">Out of lives. There’s always another hop.</p>${resultStats()}<p class="subtitle">Seed ${game.seed} · Best ${best.toLocaleString()}</p><div class="center-actions"><button type="button" class="primary" data-action="retry">Try this seed again →</button><button type="button" data-action="new">New random run</button></div><button type="button" class="subtle-action" data-action="title">Back to title</button></div>`;
    if (mode === "victory")
      panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">  \\ | /\n --\\*/--\n   /|\\\n    |\n ~~(@)~~</pre><h2>The Lily is home.</h2><p class="subtitle">Eight levels. Four guardians. One very brave frog.</p>${resultStats()}<p class="subtitle">Seed ${game.seed} · Best ${best.toLocaleString()}</p><div class="center-actions"><button type="button" class="primary" data-action="new">A new odyssey →</button><button type="button" data-action="retry">Replay this seed</button></div><button type="button" class="subtle-action" data-action="title">Back to title</button></div>`;
    renderer.resize();
    if (["paused", "clear", "gameover", "victory"].includes(mode)) {
      const primary = panel.querySelector<HTMLButtonElement>(".primary");
      primary?.focus({ preventScroll: true });
      // Short stages overflow the result panel; keep the focused action visible.
      primary?.scrollIntoView({ block: "nearest" });
    }
  }
  fitStage();
  $("score").textContent = (title ? 0 : game.score).toString().padStart(6, "0");
  $("lives").textContent = title
    ? "@ @ @"
    : Array.from({ length: 3 }, (_, i) => (i < game.lives ? "@" : "·")).join(
        " ",
      );
  $("lives").setAttribute("aria-label", `${title ? 3 : game.lives} lives`);
  $("world-label").textContent = game.level.bonus
    ? "Bonus cave"
    : WORLDS[Math.floor(game.index / 2)].name;
  $("world").textContent =
    `${String(Math.floor(game.index / 2) + 1).padStart(2, "0")}—0${(game.index % 2) + 1}`;
  $("time").textContent = String(Math.max(0, Math.ceil(game.time)));
  $("time").classList.toggle("danger", game.time < 30);
  $("seed-display").textContent = title ? "New adventure" : game.seed;
  $("seed-display").setAttribute(
    "aria-label",
    title ? "Enter a run seed" : `Run seed ${game.seed}. View and copy`,
  );
  $("best-label").textContent = !title && best ? `/ best ${best}` : "";
  document.querySelectorAll<HTMLElement>("[data-world]").forEach((stop) => {
    const current = Number(stop.dataset.world) === Math.floor(game.index / 2);
    stop.classList.toggle("current", current);
    if (current) stop.setAttribute("aria-current", "step");
    else stop.removeAttribute("aria-current");
  });
  const power =
    game.player.star > 0
      ? `* Lily Star · ${Math.ceil(game.player.star)}s`
      : game.player.fire
        ? "& Fire Fly · J / X to fire"
        : game.player.big
          ? "T Mushroom Tea · shield ready"
          : "";
  $("power-status").textContent = power;
  $("power-status").hidden = !power || mode !== "playing";
  $("death-note").hidden = mode !== "dying";
  $("death-note").textContent =
    game.lives > 0
      ? `${game.lives} ${game.lives === 1 ? "life" : "lives"} left`
      : "One last ripple…";
  $("pipe-button").hidden =
    mode !== "playing" ||
    Math.abs(game.player.x - game.level.pipe) > 90 ||
    (game.bonusVisited && !game.level.bonus);
  $<HTMLButtonElement>("fire-button").disabled =
    !game.player.fire || mode !== "playing";
  canvas.dataset.mode = mode;
  canvas.setAttribute(
    "aria-label",
    `ASCII platformer. ${WORLDS[Math.floor(game.index / 2)].name}, level ${(game.index % 2) + 1}. Score ${game.score}. ${game.lives} lives. ${mode === "paused" ? "Paused." : "A and D to move, Space to jump, P to pause."}`,
  );
  updateSettings();
}
let previous = performance.now(),
  accumulator = 0;
function frame(now: number) {
  const delta = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (!document.hidden) {
    accumulator += delta;
    while (accumulator >= 1 / 60) {
      game.update(1 / 60, readInput());
      accumulator -= 1 / 60;
    }
    for (const event of game.events.splice(0)) {
      synth.effect(event.type);
      if (event.type === "announce" && event.text) {
        $("announcement").textContent = event.text;
        hideHintsAt = now + 5000;
      }
      if (
        event.type === "clear" ||
        event.type === "gameover" ||
        event.type === "victory"
      ) {
        best = store.saveBest(game.seed, game.score);
        if (event.type !== "clear") bridge.score(game.score);
      }
    }
    synth.update(game.mode === "playing", Math.floor(game.index / 2));
    renderer.draw(delta);
    if (now - lastHud > 100 || lastMode !== game.mode) {
      sync();
      lastHud = now;
      lastMode = game.mode;
    }
    if (hideHintsAt && now > hideHintsAt) {
      $("announcement").textContent = "";
      hideHintsAt = 0;
    }
  } else accumulator = 0;
  requestAnimationFrame(frame);
}
new ResizeObserver(() => renderer.resize()).observe(stage);
window.addEventListener("resize", fitStage);
document.fonts.ready.then(() => {
  fitStage();
  renderer.resize();
});
updateSettings();
sync();
requestAnimationFrame(frame);
