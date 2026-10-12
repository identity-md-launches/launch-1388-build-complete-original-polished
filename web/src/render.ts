import { Game, FLOOR, TILE, WORLDS, rng, seedHash } from "./engine.ts";

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  width = 1152;
  height = 576;
  ratio = 1;
  reduced = false;
  clock = 0;
  stars: { x: number; y: number; n: number }[] = [];
  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.game = game;
    const random = rng(seedHash("odyssey-sky"));
    this.stars = Array.from({ length: 75 }, () => ({
      x: random() * 1800,
      y: random() * 350 + 14,
      n: random() * 9,
    }));
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.ratio));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.ratio));
    this.height =
      this.game.mode !== "title" && rect.width / Math.max(1, rect.height) > 2.2
        ? 384
        : 576;
    this.width = Math.max(
      360,
      (rect.width / Math.max(1, rect.height)) * this.height,
    );
    this.game.viewWidth = this.width;
  }
  text(
    text: string,
    x: number,
    y: number,
    color: string,
    size = 24,
    alpha = 1,
  ) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `${size}px "Space Mono", monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }
  art(
    lines: readonly string[],
    x: number,
    y: number,
    color: string,
    size = 20,
    lineHeight = 22,
  ) {
    lines.forEach((line, i) =>
      this.text(line, x, y + i * lineHeight, color, size),
    );
  }
  draw(dt: number) {
    if (!this.reduced && this.game.mode !== "paused") this.clock += dt;
    const g = this.game,
      ctx = this.ctx;
    const worldIndex = g.level.bonus ? 1 : Math.floor(g.index / 2);
    const world = WORLDS[worldIndex];
    ctx.setTransform(
      this.canvas.width / this.width,
      0,
      0,
      this.canvas.height / this.height,
      0,
      0,
    );
    ctx.fillStyle = world.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    const offsetY = 576 - this.height;
    ctx.translate(0, -offsetY);
    if (g.shake > 0 && !this.reduced)
      ctx.translate(
        Math.sin(this.clock * 137) * g.shake * 19,
        Math.cos(this.clock * 103) * g.shake * 13,
      );
    const cam = this.reduced ? 0 : g.camera;
    for (const star of this.stars) {
      const x = (((star.x - cam * 0.08) % 1800) + 1800) % 1800;
      this.text(
        star.n > 7 ? "+" : ".",
        x,
        star.y,
        world.accent,
        star.n > 7 ? 16 : 13,
        0.22 +
          (this.reduced
            ? 0.15
            : (Math.sin(this.clock * 0.7 + star.n) + 1) * 0.17),
      );
    }
    if (worldIndex === 1) {
      for (let i = -1; i < this.width / 170 + 2; i++) {
        const x = i * 170 - ((cam * 0.15) % 170);
        this.art(
          ["\\       /", " \\ VVV / ", "  \\ V /  ", "   \\V/   "],
          x,
          15,
          world.far,
          26,
          29,
        );
        this.art(
          ["   /\\   ", "  /::\\  ", " /::::\\ ", "/::::::\\"],
          x + 80,
          346,
          world.mid,
          20,
          29,
        );
      }
    } else {
      for (let i = -1; i < this.width / 350 + 2; i++) {
        const x = i * 350 - ((cam * 0.12) % 350);
        this.art(
          ["     .----.      ", "  .-(      )-.   ", " (____________)  "],
          x + 100,
          48 + (i % 2) * 52,
          world.far,
          19,
          22,
        );
        if (worldIndex === 3)
          this.art(
            [
              "  |^|      |^|  ",
              "  |#|______|#|  ",
              "  |##|####|##|  ",
              "  |##|#[]#|##|  ",
              " /|##|####|##|\\ ",
            ],
            x,
            229,
            world.far,
            28,
            34,
          );
        else
          this.art(
            [
              "       /\\       ",
              "      /..\\      ",
              "  /\\ /....\\ /\\ ",
              " /..V......V..\\",
              "/..............\\",
            ],
            x,
            263,
            world.far,
            28,
            34,
          );
      }
    }
    for (let i = -1; i < this.width / 208 + 2; i++) {
      const x = i * 208 - ((cam * 0.32) % 208);
      if (worldIndex === 0)
        this.art(
          ["    |   /      ", "  \\|/  |/  |  ", " ~~|||~~||~~|~~"],
          x,
          366,
          world.mid,
          22,
          27,
        );
      if (worldIndex === 2)
        this.art(
          ["   .(~~).  ", " (~~~~~~~~)", "  ~~~~~~~~ "],
          x,
          332 + (i % 2) * 35,
          world.mid,
          24,
          28,
        );
      if (worldIndex === 3)
        this.art(
          ["  |     |  ", " /#\\   /#\\ ", " |#|___|#| "],
          x,
          362,
          world.mid,
          22,
          28,
        );
    }
    if (g.mode === "title") {
      ctx.fillStyle = world.bg;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
      this.drawTitleScene();
      ctx.restore();
      return;
    }
    const start = Math.floor(g.camera / TILE) - 1;
    const end = start + Math.ceil(this.width / TILE) + 3;
    for (let c = start; c < end; c++) {
      const x = c * TILE - g.camera;
      if (!g.level.tiles.has(`${c},15`)) {
        this.text(
          this.clock % 1 > 0.5 ? "~~" : "~≈",
          x,
          FLOOR + 1,
          "#79bde8",
          25,
        );
        this.text(
          "~",
          x + 5,
          FLOOR + 27 + Math.sin(this.clock * 2 + c) * 2,
          "#397197",
          26,
        );
        this.text(".", x + 12, FLOOR + 64, "#397197", 22);
      }
      for (let r = 0; r < 18; r++) {
        const tile = g.level.tiles.get(`${c},${r}`);
        if (!tile) continue;
        const y =
          r * TILE -
          (tile.bump > 0 ? Math.sin((tile.bump / 0.2) * Math.PI) * 7 : 0);
        if (tile.kind === "=") {
          this.text(
            r === 15 ? "≡" : (c + r) % 4 === 0 ? "#" : ":",
            x + 3,
            y - 2,
            r === 15 ? world.ground : world.mid,
            29,
            r === 15 ? 1 : 0.75,
          );
        } else if (tile.kind === "-")
          this.text("===", x - 1, y - 9, world.accent, 18);
        else {
          const color =
            tile.kind === "?"
              ? "#ffdb7d"
              : tile.kind === "#"
                ? "#d19a77"
                : "#6e7d78";
          this.text(`[${tile.kind}]`, x - 1, y, color, 18);
        }
      }
    }
    for (const fly of g.level.flies)
      if (
        !fly.taken &&
        fly.x > g.camera - 20 &&
        fly.x < g.camera + this.width + 20
      ) {
        this.text(
          "*",
          fly.x - g.camera - 9,
          fly.y -
            13 +
            (this.reduced ? 0 : Math.sin(this.clock * 3 + fly.x) * 3),
          "#ffdf83",
          27,
        );
      }
    for (const at of g.level.checkpoints)
      if (at > g.camera - 30 && at < g.camera + this.width + 30) {
        const active = at <= g.checkpoint;
        this.art(
          [active ? "[+]" : "[ ]", " | ", " | "],
          at - g.camera,
          FLOOR - 59,
          active ? "#abedb7" : "#738a78",
          15,
          19,
        );
      }
    const pipeX = g.level.pipe - g.camera;
    if (pipeX > -90 && pipeX < this.width + 90) {
      this.art(
        ["[====]", " |||| ", " |||| "],
        pipeX - 16,
        FLOOR - 58,
        g.bonusVisited && !g.level.bonus ? "#738a78" : "#a8c399",
        18,
        20,
      );
      if (
        Math.abs(g.player.x - g.level.pipe) < 110 &&
        (!g.bonusVisited || g.level.bonus)
      )
        this.text("↓ secret", pipeX - 34, FLOOR - 95, "#e6ebd8", 15);
    }
    if (!g.level.bonus) {
      const fx = g.level.flag - g.camera;
      if (fx > -50 && fx < this.width + 150) {
        this.art(
          [
            "|>***",
            "| >> ",
            "|    ",
            "|    ",
            "|    ",
            "|    ",
            "|    ",
            "|    ",
            "|    ",
            "|    ",
          ],
          fx,
          FLOOR - 240,
          "#ffe09b",
          22,
          24,
        );
        this.text(
          g.level.boss && g.level.boss.hp > 0
            ? "defeat guardian"
            : "homeward →",
          fx - 58,
          FLOOR - 273,
          world.accent,
          15,
        );
      }
      // A few environmental instructions appear exactly where they matter.
      if (g.index === 0 && g.camera < 850) {
        this.text("← A / D →", 95 - g.camera, FLOOR - 100, "#a8c4b2", 16);
        this.text("hold jump ↗", 385 - g.camera, FLOOR - 206, "#c4d4be", 16);
        this.text("stomp ↓", 729 - g.camera, FLOOR - 109, "#ffb7ac", 15);
      }
    }
    for (const enemy of g.level.enemies)
      if (
        enemy.alive &&
        enemy.x > g.camera - 80 &&
        enemy.x < g.camera + this.width + 80
      ) {
        const ex = enemy.x - g.camera;
        this.text(
          enemy.type === "beetle" ? "ö" : "§",
          ex,
          enemy.y - 10,
          "#ff8e92",
          34,
        );
        this.text(
          enemy.type === "beetle"
            ? Math.sin(this.clock * 10) > 0
              ? "/\\"
              : "\\/"
            : "^",
          ex + 2,
          enemy.y + 18,
          "#e8757b",
          13,
        );
      }
    for (const pickup of g.pickups) {
      const symbol =
        pickup.type === "tea" ? "T" : pickup.type === "fire" ? "&" : "*";
      this.text(
        symbol,
        pickup.x - g.camera,
        pickup.y - 4,
        pickup.type === "tea"
          ? "#f4bf89"
          : pickup.type === "fire"
            ? "#ff9d74"
            : "#d1b7ff",
        29,
      );
    }
    const boss = g.level.boss;
    if (boss && boss.hp > 0 && boss.x - g.camera < this.width + 160) {
      this.art(
        WORLDS[Math.floor(g.index / 2)].art,
        boss.x - g.camera - 6,
        boss.y,
        boss.hurt > 0 ? "#fff3db" : "#ff8e92",
        17,
        21,
      );
      if (boss.cooldown < 0.6)
        this.text("!", boss.x - g.camera + 45, boss.y - 40, "#ffdb7d", 30);
      if (boss.active) {
        const label = `${WORLDS[Math.floor(g.index / 2)].boss}  ${"■".repeat(boss.hp)}${"□".repeat(boss.maxHp - boss.hp)}`;
        this.text(
          label,
          Math.max(20, this.width / 2 - label.length * 5.5),
          78 + offsetY,
          "#ffb7ac",
          18,
        );
      }
    }
    for (const shot of g.shots)
      this.text(
        shot.hostile ? "x" : "o",
        shot.x - g.camera,
        shot.y - 5,
        shot.hostile ? "#ff8e92" : "#ffdc89",
        23,
      );
    const p = g.player;
    const invisible =
      p.invulnerable > 0 && Math.floor(this.clock * 12) % 2 === 0;
    {
      let color = p.fire ? "#ffe09b" : "#a8f3bd";
      if (p.star > 0)
        color = this.reduced
          ? "#ffffff"
          : ["#a8f3bd", "#ffe09b", "#d9b4ff", "#9cd7fc"][
              Math.floor(this.clock * 5) % 4
            ];
      if (g.mode === "dying") color = "#ff8e92";
      this.text(
        g.mode === "dying" ? "x" : "@",
        p.x - g.camera - 1,
        p.y - (p.big ? 9 : 8),
        color,
        p.big ? 46 : 34,
        invisible && !this.reduced ? 0.45 : 1,
      );
      if (p.grounded && Math.abs(p.vx) > 40)
        this.text(
          this.clock % 0.3 > 0.15 ? "' '" : " . ",
          p.x - g.camera - 3,
          p.y + p.h - 4,
          color,
          11,
        );
    }
    for (const fx of g.particles)
      this.text(
        fx.text,
        fx.x - g.camera,
        fx.y,
        fx.color,
        fx.text.length > 1 ? 16 : 21,
        Math.min(1, fx.life * 3),
      );
    if (g.bannerTimer > 0 && !boss?.active) {
      const size = this.width < 700 ? 13 : 16;
      ctx.font = `${size}px "Space Mono", monospace`;
      const lines: string[] = [""];
      for (const word of g.banner.split(" ")) {
        const last = lines.length - 1;
        const candidate = lines[last] ? `${lines[last]} ${word}` : word;
        if (ctx.measureText(candidate).width > this.width - 48 && lines[last])
          lines.push(word);
        else lines[last] = candidate;
      }
      ctx.fillStyle = world.bg;
      ctx.globalAlpha = 0.94;
      ctx.fillRect(12, 14 + offsetY, this.width - 24, 19 + lines.length * 20);
      ctx.globalAlpha = 1;
      lines.forEach((line, i) =>
        this.text(
          line,
          Math.max(20, (this.width - ctx.measureText(line).width) / 2),
          23 + offsetY + i * 20,
          world.accent,
          size,
        ),
      );
    }
    ctx.restore();
  }
  drawTitleScene() {
    const world = WORLDS[0];
    const compact = this.width < 720;
    const start = compact ? this.width - 180 : this.width * 0.59;
    // The title diorama is drawn from the same character vocabulary as play.
    const y = 416;
    this.art(
      [
        "        .         +         ",
        "    +         .             ",
        "                __          ",
        "       _     __(  )__       ",
        "      ( )   (________)      ",
      ],
      start - 20,
      128,
      "#466e5a",
      18,
      24,
    );
    this.art(
      [
        "        .--.  .--.        ",
        "       / oo \\/ oo \\       ",
        "       |    ||    |       ",
        "    .--\\____/\\____/--.    ",
        "   /      ______      \\   ",
        "  |     /        \\     |  ",
        "  |    |  _    _  |    |  ",
        "   \\    \\______/    /   ",
        "    \\______________/    ",
        "     /    @@@@@@    \\    ",
        "    /   @@@@@@@@@@   \\   ",
        "   /____/        \\____\\  ",
      ],
      start - (compact ? 4 : 45),
      compact ? 365 : 171,
      "#9be4ac",
      compact ? 8 : 16,
      compact ? 9 : 18,
    );
    this.text(
      "*",
      start + (compact ? 134 : 235),
      (compact ? 418 : 246) + Math.sin(this.clock * 2) * 6,
      "#ffdb7d",
      compact ? 18 : 31,
    );
    this.text(
      "*",
      start - 60,
      (compact ? 432 : 302) + Math.sin(this.clock * 2 + 1) * 6,
      "#ffdb7d",
      26,
    );
    this.art(
      ["[?] [#] [?]", "           "],
      start + (compact ? -134 : 222),
      compact ? 435 : y - 77,
      "#ffdb7d",
      19,
      24,
    );
    this.text("@", start + 89, y - 26, "#a8f3bd", 34);
    this.text("ö", start + 280, y + 11, "#ff8e92", 34);
    this.art(
      ["|>***", "| >> ", "|    ", "|    ", "|    "],
      this.width - 56,
      compact ? y + 20 : y - 28,
      "#ffe09b",
      17,
      20,
    );
    for (let x = 0; x < this.width; x += 32) {
      const pond = x > start + 154 && x < start + 252;
      this.text(
        pond ? "~" : "≡",
        x,
        y + 47,
        pond ? "#79bde8" : world.ground,
        28,
      );
      this.text(
        pond ? "~" : ":",
        x + 7,
        y + 79,
        pond ? "#397197" : world.mid,
        25,
      );
      this.text(
        pond ? "." : x % 64 ? ":" : "#",
        x + 3,
        y + 112,
        pond ? "#397197" : world.far,
        25,
      );
    }
    this.text("||", start - 70, y + 14, "#9aba87", 29);
  }
}
