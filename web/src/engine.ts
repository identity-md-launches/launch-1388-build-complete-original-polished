export const TILE = 32;
export const FLOOR = 480;
export const TOTAL_LEVELS = 8;
export type Mode =
  | "title"
  | "playing"
  | "paused"
  | "dying"
  | "clear"
  | "gameover"
  | "victory";
export type Power = "tea" | "fire" | "star";
export type TileKind = "=" | "#" | "?" | ":" | "-";
export type Input = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  fire: boolean;
  down: boolean;
};
export const emptyInput = (): Input => ({
  left: false,
  right: false,
  jump: false,
  run: false,
  fire: false,
  down: false,
});
export type Rect = { x: number; y: number; w: number; h: number };
export type Tile = {
  c: number;
  r: number;
  kind: TileKind;
  power?: Power;
  bump: number;
};
export type Enemy = Rect & {
  type: "beetle" | "snail";
  vx: number;
  alive: boolean;
  home: number;
  range: number;
};
export type Fly = { x: number; y: number; taken: boolean };
export type Pickup = Rect & { type: Power; vy: number; life: number };
export type Shot = Rect & {
  vx: number;
  vy: number;
  life: number;
  hostile: boolean;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  max: number;
};
export type Player = Rect & {
  vx: number;
  vy: number;
  grounded: boolean;
  face: number;
  big: boolean;
  fire: boolean;
  star: number;
  invulnerable: number;
};
export type Boss = Rect & {
  hp: number;
  maxHp: number;
  home: number;
  phase: number;
  cooldown: number;
  hurt: number;
  active: boolean;
};
export type Level = {
  tiles: Map<string, Tile>;
  flies: Fly[];
  enemies: Enemy[];
  width: number;
  flag: number;
  pipe: number;
  checkpoints: number[];
  boss?: Boss;
  bonus: boolean;
};
export type GameEvent = { type: string; text?: string; value?: number };
export const WORLDS = [
  {
    name: "Swamp",
    subtitle: "The whispering shallows",
    bg: "#101e1c",
    far: "#24443b",
    mid: "#396653",
    ground: "#76bb83",
    accent: "#a8edb5",
    boss: "Reed Warden",
    art: ["   \\___//   ", "  (o   o)  ", " /|#####|\\ ", "  /|___|\\  "],
  },
  {
    name: "Caves",
    subtitle: "Below the roots",
    bg: "#1b1729",
    far: "#332846",
    mid: "#66517f",
    ground: "#b5a0d6",
    accent: "#d1b7ff",
    boss: "Crystal Moth",
    art: [" \\  /\\  / ", "(><(oo)><)", " /\\/==\\/\\ ", "   /  \\   "],
  },
  {
    name: "Sky Pads",
    subtitle: "A little closer to the stars",
    bg: "#172330",
    far: "#2e4257",
    mid: "#61758b",
    ground: "#a5d2d1",
    accent: "#f0c9e8",
    boss: "Cloud Serpent",
    art: ["    /^\\__  ", "  <(o o) > ", " /==/ \\==\\ ", " ~~~   ~~~ "],
  },
  {
    name: "Bog Castle",
    subtitle: "The last light in the marsh",
    bg: "#26191e",
    far: "#462833",
    mid: "#77424c",
    ground: "#d29085",
    accent: "#ffad9f",
    boss: "The Bog King",
    art: ["  \\|V|/   ", "  [o o]   ", " /{###}\\  ", " _/===\\_  "],
  },
] as const;
export const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function seedHash(seed: string): number {
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function rng(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let n = seed;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function normalizeSeed(seed: string): string {
  return seed
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}
export function randomSeed(): string {
  const words = ["LILY", "MOSS", "POND", "REED", "MIST", "FROG", "FERN", "BOG"];
  const a = new Uint32Array(2);
  globalThis.crypto.getRandomValues(a);
  return `${words[a[0] % words.length]}-${(a[1] % 10000).toString().padStart(4, "0")}`;
}
const key = (c: number, r: number) => `${c},${r}`;
export function generateLevel(
  seed: string,
  index: number,
  bonus = false,
): Level {
  const random = rng(seedHash(`${seed}:${index}:${bonus}`));
  const length = bonus ? 38 : 288 + index * 8;
  const tiles = new Map<string, Tile>();
  const flies: Fly[] = [],
    enemies: Enemy[] = [];
  const put = (c: number, r: number, kind: TileKind, power?: Power) =>
    tiles.set(key(c, r), { c, r, kind, power, bump: 0 });
  for (let c = 0; c < length; c++) for (let r = 15; r < 18; r++) put(c, r, "=");
  if (bonus) {
    for (let c = 5; c < 32; c += 2) {
      flies.push({
        x: c * TILE + 16,
        y: FLOOR - 56 - Math.sin(c * 0.35) * 56,
        taken: false,
      });
      if (c % 4 === 1) put(c, 11, "-");
    }
    put(19, 8, "?", "star");
    return {
      tiles,
      flies,
      enemies,
      width: length * TILE,
      flag: (length - 3) * TILE,
      pipe: (length - 4) * TILE,
      checkpoints: [],
      bonus: true,
    };
  }
  // A safe opening teaches the vocabulary before the procedural sections.
  for (let c = 7; c <= 10; c++)
    flies.push({ x: c * TILE + 16, y: FLOOR - 56, taken: false });
  put(12, 11, "?", "tea");
  put(13, 11, "#");
  put(14, 11, "#");
  put(19, 10, "?", "fire");
  put(18, 10, "#");
  enemies.push({
    x: 24 * TILE,
    y: FLOOR - 25,
    w: 27,
    h: 25,
    type: "beetle",
    vx: -45,
    alive: true,
    home: 24 * TILE,
    range: 80,
  });
  const checkpoints: number[] = [];
  for (let start = 32; start < length - 34; start += 28) {
    const gap = 2 + Math.floor(random() * (index < 2 ? 2 : 3));
    const gapStart = start + 20;
    for (let c = gapStart; c < gapStart + gap; c++)
      for (let r = 15; r < 18; r++) tiles.delete(key(c, r));
    const elevated = random() > 0.45;
    if (elevated)
      for (let c = gapStart - 2; c < gapStart + gap + 1; c++) put(c, 12, "-");
    const blockCol = start + 4;
    put(blockCol, 11, "#");
    put(
      blockCol + 1,
      11,
      "?",
      (["tea", "fire", "star"] as Power[])[Math.floor(random() * 3)],
    );
    put(blockCol + 2, 11, "#");
    if (random() > 0.5) put(blockCol + 3, 8, "?", "star");
    for (let j = 0; j < 5; j++)
      flies.push({
        x: (gapStart - 1 + j) * TILE + 16,
        y: FLOOR - (elevated ? 144 : 80) - Math.sin((j / 4) * Math.PI) * 35,
        taken: false,
      });
    const type = random() > 0.68 ? "snail" : "beetle";
    enemies.push({
      x: (start + 12) * TILE,
      y: FLOOR - 25,
      w: 27,
      h: 25,
      type,
      vx: (random() > 0.5 ? 1 : -1) * (type === "snail" ? 28 : 42 + index * 3),
      alive: true,
      home: (start + 12) * TILE,
      range: 72,
    });
    if ((start - 32) % 84 === 0) checkpoints.push((start - 2) * TILE);
  }
  const pipe = 62 * TILE;
  // The pipe and every checkpoint are on guaranteed solid terrain.
  for (let c = 60; c <= 65; c++) for (let r = 15; r < 18; r++) put(c, r, "=");
  const boss =
    index % 2 === 1
      ? {
          x: (length - 17) * TILE,
          y: FLOOR - 86,
          w: 110,
          h: 86,
          hp: 3 + Math.floor(index / 2),
          maxHp: 3 + Math.floor(index / 2),
          home: (length - 17) * TILE,
          phase: 0,
          cooldown: 2.5,
          hurt: 0,
          active: false,
        }
      : undefined;
  if (boss) checkpoints.push((length - 27) * TILE);
  for (const checkpoint of checkpoints) {
    const center = Math.floor(checkpoint / TILE);
    for (let c = center - 1; c <= center + 3; c++)
      for (let r = 15; r < 18; r++) put(c, r, "=");
  }
  return {
    tiles,
    flies,
    enemies,
    width: length * TILE,
    flag: (length - 7) * TILE,
    pipe,
    checkpoints,
    boss,
    bonus: false,
  };
}

export class Game {
  mode: Mode = "title";
  seed = "POND-1985";
  index = 0;
  lives = 3;
  score = 0;
  totalFlies = 0;
  stomps = 0;
  time = 150;
  elapsed = 0;
  levelElapsed = 0;
  camera = 0;
  viewWidth = 1152;
  checkpoint = 96;
  checkpointIndex = -1;
  level: Level = generateLevel(this.seed, 0);
  player: Player = this.freshPlayer();
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  shots: Shot[] = [];
  events: GameEvent[] = [];
  shake = 0;
  deathTimer = 0;
  jumpBuffer = 0;
  coyote = 0;
  jumpHeld = 0;
  shotTimer = 0;
  lastJump = false;
  lastDown = false;
  stageScore = 0;
  flagBonus = 0;
  timeBonus = 0;
  banner = "";
  bannerTimer = 0;
  bonusVisited = false;
  returnState?: {
    level: Level;
    x: number;
    y: number;
    camera: number;
    time: number;
    checkpoint: number;
  };
  freshPlayer(): Player {
    return {
      x: 96,
      y: FLOOR - 30,
      w: 26,
      h: 30,
      vx: 0,
      vy: 0,
      grounded: false,
      face: 1,
      big: false,
      fire: false,
      star: 0,
      invulnerable: 0,
    };
  }
  emit(type: string, text?: string, value?: number) {
    this.events.push({ type, text, value });
  }
  announce(text: string, duration = 3) {
    this.banner = text;
    this.bannerTimer = duration;
    this.emit("announce", text);
  }
  start(seed: string) {
    this.seed = normalizeSeed(seed) || "POND-1985";
    this.index = 0;
    this.lives = 3;
    this.score = 0;
    this.totalFlies = 0;
    this.stomps = 0;
    this.elapsed = 0;
    this.player = this.freshPlayer();
    this.events = [];
    this.loadLevel();
    this.emit("start");
  }
  loadLevel() {
    this.level = generateLevel(this.seed, this.index);
    this.time = 150;
    this.levelElapsed = 0;
    this.camera = 0;
    this.checkpoint = 96;
    this.checkpointIndex = -1;
    this.player.x = 96;
    this.player.y = FLOOR - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.star = 0;
    this.player.invulnerable = 1;
    this.shots = [];
    this.pickups = [];
    this.particles = [];
    this.mode = "playing";
    this.bonusVisited = false;
    this.returnState = undefined;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.lastJump = false;
    this.lastDown = false;
    this.shotTimer = 0;
    this.stageScore = this.score;
    this.announce(
      `${Math.floor(this.index / 2) + 1}-${(this.index % 2) + 1} / ${WORLDS[Math.floor(this.index / 2)].subtitle}`,
      3.8,
    );
  }
  pause() {
    if (this.mode === "playing") {
      this.mode = "paused";
      this.emit("pause");
    }
  }
  resume() {
    if (this.mode === "paused") {
      this.mode = "playing";
      this.lastJump = false;
      this.emit("resume");
    }
  }
  next() {
    if (this.mode !== "clear") return;
    this.index++;
    this.loadLevel();
    this.emit("next");
  }
  addScore(n: number, x?: number, y?: number) {
    this.score += Math.max(0, Math.floor(n));
    if (x !== undefined && y !== undefined)
      this.popup(`+${n}`, x, y, "#ffe09b");
  }
  popup(text: string, x: number, y: number, color = "#a0f3bb") {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -34,
      text,
      color,
      life: 1.2,
      max: 1.2,
    });
  }
  burst(x: number, y: number, text = "'", color = "#a0f3bb", count = 6) {
    for (let i = 0; i < count; i++)
      this.particles.push({
        x,
        y,
        vx: Math.cos(i * 2.4) * 65,
        vy: -40 - i * 12,
        text,
        color,
        life: 0.35 + i * 0.055,
        max: 0.7,
      });
  }
  die() {
    if (this.mode !== "playing") return;
    this.lives--;
    this.player.vx = 0;
    this.player.vy = -180;
    this.deathTimer = 1.15;
    this.mode = "dying";
    this.shake = 0.18;
    this.emit("death");
    this.burst(this.player.x, this.player.y, "x", "#ff8e92", 8);
  }
  hurt() {
    const p = this.player;
    if (p.star > 0 || p.invulnerable > 0 || this.mode !== "playing") return;
    if (p.big) {
      p.big = false;
      p.fire = false;
      p.y += p.h - 30;
      p.h = 30;
      p.invulnerable = 2;
      this.shake = 0.16;
      this.announce("Tea shield used. Keep going!", 2);
      this.emit("hurt");
    } else this.die();
  }
  collectPower(type: Power) {
    if (type === "star") {
      this.player.star = 9;
      this.announce("Lily Star / 9 seconds of invincibility");
    } else {
      if (!this.player.big) {
        this.player.h = 44;
        this.player.y -= 14;
      }
      this.player.big = true;
      if (type === "fire") {
        this.player.fire = true;
        this.announce("Fire Fly / J or X to spit fire");
      } else this.announce("Mushroom Tea / one extra hit");
    }
    this.addScore(100);
    this.emit("power");
  }
  enterBonus() {
    if (this.level.bonus || this.bonusVisited) return;
    this.returnState = {
      level: this.level,
      x: this.level.pipe + 76,
      y: FLOOR - this.player.h,
      camera: this.camera,
      time: this.time,
      checkpoint: this.checkpoint,
    };
    this.level = generateLevel(this.seed, this.index, true);
    this.player.x = 70;
    this.player.y = FLOOR - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.camera = 0;
    this.shots = [];
    this.pickups = [];
    this.particles = [];
    this.time = 25;
    this.bonusVisited = true;
    this.emit("pipe");
    this.announce("Secret root cellar / collect flies, then reach the pipe");
  }
  exitBonus() {
    if (!this.returnState) return;
    const back = this.returnState;
    this.level = back.level;
    this.player.x = back.x;
    this.player.y = back.y;
    this.player.vy = 0;
    this.camera = back.camera;
    this.time = back.time;
    this.checkpoint = back.checkpoint;
    this.returnState = undefined;
    this.shots = [];
    this.pickups = [];
    this.particles = [];
    this.player.invulnerable = 1;
    this.emit("pipe");
    this.announce("Back to the journey");
  }
  finishLevel() {
    if (
      this.mode !== "playing" ||
      this.level.bonus ||
      (this.level.boss && this.level.boss.hp > 0)
    )
      return;
    this.flagBonus =
      100 +
      Math.min(
        900,
        Math.floor(Math.max(0, FLOOR - this.player.y - this.player.h) / 24) *
          150,
      );
    this.timeBonus = Math.floor(this.time) * 5;
    this.score += this.flagBonus + this.timeBonus;
    this.mode = this.index === TOTAL_LEVELS - 1 ? "victory" : "clear";
    this.emit(this.mode, undefined, this.score);
    this.burst(this.player.x, this.player.y, "*", "#ffe09b", 14);
  }
  hitBoss() {
    const boss = this.level.boss;
    if (!boss || boss.hp <= 0 || boss.hurt > 0) return;
    boss.hp--;
    boss.hurt = 1;
    this.shake = 0.23;
    this.emit("boss-hit");
    this.burst(boss.x + boss.w / 2, boss.y + 25, "#", "#ffb09e", 10);
    if (boss.hp === 0) {
      this.addScore(1000, boss.x, boss.y);
      this.emit("boss-dead");
      this.announce(
        this.index === 7
          ? "The Golden Lily is free. Reach the flag!"
          : "Guardian defeated. Reach the flag!",
        5,
      );
      this.shots = this.shots.filter((s) => !s.hostile);
    }
  }
  bump(tile: Tile) {
    tile.bump = 0.2;
    if (tile.kind === "?") {
      tile.kind = ":";
      this.pickups.push({
        x: tile.c * TILE + 3,
        y: tile.r * TILE - 30,
        w: 26,
        h: 26,
        type: tile.power || "tea",
        vy: -90,
        life: 20,
      });
      this.emit("block");
    } else if (tile.kind === "#") {
      this.level.tiles.delete(key(tile.c, tile.r));
      this.addScore(10);
      this.burst(tile.c * TILE + 16, tile.r * TILE, "#", "#cc9976", 6);
      this.emit("brick");
    }
  }
  nearby(rect: Rect): Tile[] {
    const result: Tile[] = [];
    for (
      let c = Math.floor(rect.x / TILE);
      c <= Math.floor((rect.x + rect.w - 0.01) / TILE);
      c++
    )
      for (
        let r = Math.floor(rect.y / TILE);
        r <= Math.floor((rect.y + rect.h - 0.01) / TILE);
        r++
      ) {
        const t = this.level.tiles.get(key(c, r));
        if (t) result.push(t);
      }
    return result;
  }
  update(dt: number, input: Input) {
    if (this.mode === "paused") return;
    dt = Math.min(dt, 1 / 30);
    for (const fx of this.particles) {
      fx.x += fx.vx * dt;
      fx.y += fx.vy * dt;
      fx.life -= dt;
    }
    this.particles = this.particles.filter((fx) => fx.life > 0);
    this.shake = Math.max(0, this.shake - dt);
    if (this.mode === "dying") {
      this.player.y += this.player.vy * dt;
      this.player.vy += 900 * dt;
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) {
          this.mode = "gameover";
          this.emit("gameover", undefined, this.score);
        } else {
          if (this.level.bonus) this.exitBonus();
          this.player = this.freshPlayer();
          this.player.x = this.checkpoint;
          this.player.invulnerable = 2.5;
          this.camera = Math.max(0, this.player.x - this.viewWidth * 0.3);
          this.time = Math.max(this.time, 60);
          this.shots = [];
          this.mode = "playing";
          this.lastJump = input.jump;
          this.jumpBuffer = 0;
          this.coyote = 0;
          this.announce(
            `${this.lives} ${this.lives === 1 ? "life" : "lives"} left / back at the reed marker`,
          );
        }
      }
      return;
    }
    if (this.mode !== "playing") return;
    this.elapsed += dt;
    this.levelElapsed += dt;
    this.time -= dt;
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    if (this.time <= 0) {
      if (this.level.bonus) this.exitBonus();
      else this.die();
      return;
    }
    const p = this.player;
    p.star = Math.max(0, p.star - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    this.shotTimer = Math.max(0, this.shotTimer - dt);
    if (input.jump && !this.lastJump) this.jumpBuffer = 0.14;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.lastJump = input.jump;
    this.coyote = p.grounded ? 0.11 : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -555;
      p.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumpHeld = 0;
      this.emit("jump");
    }
    this.jumpHeld += dt;
    if (!input.jump && p.vy < -220) p.vy += 1550 * dt;
    const direction = Number(input.right) - Number(input.left);
    const speed = input.run ? 295 : 205;
    const target = direction * speed;
    const accel = (p.grounded ? 1900 : 1350) * dt;
    p.vx += Math.max(-accel, Math.min(accel, target - p.vx));
    if (direction) p.face = direction;
    p.x += p.vx * dt;
    for (const tile of this.nearby(p)) {
      if (tile.kind === "-") continue;
      if (p.vx > 0) p.x = tile.c * TILE - p.w;
      else if (p.vx < 0) p.x = (tile.c + 1) * TILE;
      p.vx = 0;
    }
    p.x = Math.max(0, Math.min(p.x, this.level.width - p.w));
    const oldBottom = p.y + p.h;
    const wasGrounded = p.grounded;
    p.vy +=
      1550 * (input.jump && p.vy < 0 && this.jumpHeld < 0.24 ? 0.56 : 1) * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    for (const tile of this.nearby(p)) {
      const top = tile.r * TILE;
      if (tile.kind === "-" && (p.vy < 0 || oldBottom > top + 3)) continue;
      if (p.vy >= 0 && oldBottom <= top + 10) {
        p.y = top - p.h;
        p.vy = 0;
        p.grounded = true;
      } else if (p.vy < 0 && tile.kind !== "-") {
        p.y = top + TILE;
        p.vy = 30;
        this.bump(tile);
      }
    }
    if (p.grounded && !wasGrounded)
      this.burst(p.x + 12, p.y + p.h, "'", "#a4bca8", 4);
    if (p.y > 620) {
      this.die();
      return;
    }
    for (const t of this.level.tiles.values()) if (t.bump > 0) t.bump -= dt;
    for (const fly of this.level.flies)
      if (
        !fly.taken &&
        overlap(p, { x: fly.x - 10, y: fly.y - 12, w: 22, h: 24 })
      ) {
        fly.taken = true;
        this.totalFlies++;
        this.addScore(10);
        this.burst(fly.x, fly.y, "+", "#ffe09b", 3);
        this.emit("fly");
      }
    for (const pickup of this.pickups) {
      pickup.life -= dt;
      pickup.vy += 700 * dt;
      const old = pickup.y + pickup.h;
      pickup.y += pickup.vy * dt;
      for (const t of this.nearby(pickup))
        if (pickup.vy >= 0 && old <= t.r * TILE + 10) {
          pickup.y = t.r * TILE - pickup.h;
          pickup.vy = 0;
        }
      if (overlap(p, pickup)) {
        this.collectPower(pickup.type);
        pickup.life = 0;
      }
    }
    this.pickups = this.pickups.filter(
      (pickup) => pickup.life > 0 && pickup.y < 620,
    );
    for (const enemy of this.level.enemies) {
      if (!enemy.alive || Math.abs(enemy.x - p.x) > this.viewWidth + 250)
        continue;
      const nextX = enemy.x + enemy.vx * dt;
      const edge = enemy.vx > 0 ? nextX + enemy.w : nextX;
      if (
        Math.abs(nextX - enemy.home) > enemy.range ||
        !this.level.tiles.has(key(Math.floor(edge / TILE), 15))
      )
        enemy.vx *= -1;
      else enemy.x = nextX;
      if (overlap(p, enemy)) {
        if (
          p.star > 0 ||
          (enemy.type === "beetle" && p.vy > 0 && oldBottom <= enemy.y + 13)
        ) {
          enemy.alive = false;
          this.addScore(100, enemy.x, enemy.y - 12);
          this.stomps++;
          this.emit("stomp");
          this.burst(enemy.x, enemy.y, "x", "#ff8e92", 4);
          if (p.star <= 0) p.vy = input.jump ? -420 : -310;
        } else this.hurt();
      }
    }
    if (input.fire && p.fire && this.shotTimer <= 0) {
      this.shots.push({
        x: p.x + (p.face > 0 ? p.w : -14),
        y: p.y + p.h / 2,
        w: 14,
        h: 14,
        vx: p.face * 420,
        vy: 0,
        life: 2.2,
        hostile: false,
      });
      this.shotTimer = 0.32;
      this.emit("fire");
    }
    const boss = this.level.boss;
    if (boss && boss.hp > 0 && p.x > boss.home - this.viewWidth * 0.85) {
      if (!boss.active) {
        boss.active = true;
        this.announce(
          `${WORLDS[Math.floor(this.index / 2)].boss} / jump on its head or use fire`,
          5,
        );
      }
      boss.phase += dt;
      boss.cooldown -= dt;
      boss.hurt = Math.max(0, boss.hurt - dt);
      boss.x = boss.home + Math.sin(boss.phase * 1.4) * 95;
      if (boss.cooldown <= 0) {
        const direction = p.x < boss.x ? -1 : 1;
        this.shots.push({
          x: boss.x + boss.w / 2,
          y: FLOOR - 28,
          w: 19,
          h: 19,
          vx: direction * (165 + this.index * 6),
          vy: 0,
          life: 5,
          hostile: true,
        });
        boss.cooldown = Math.max(1.35, 2.25 - this.index * 0.1);
        this.emit("boss-shot");
      }
      if (overlap(p, boss)) {
        if (p.star > 0 || (p.vy > 0 && oldBottom <= boss.y + 20)) {
          this.hitBoss();
          p.vy = -470;
          p.y = boss.y - p.h;
        } else this.hurt();
      }
    }
    for (const shot of this.shots) {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      if (!shot.hostile) {
        shot.vy += 500 * dt;
        const old = shot.y + shot.h;
        shot.y += shot.vy * dt;
        for (const tile of this.nearby(shot)) {
          if (shot.vy >= 0 && old <= tile.r * TILE + 10) {
            shot.y = tile.r * TILE - shot.h;
            shot.vy = -190;
          } else shot.life = 0;
        }
        for (const enemy of this.level.enemies)
          if (enemy.alive && overlap(shot, enemy)) {
            enemy.alive = false;
            shot.life = 0;
            this.addScore(100, enemy.x, enemy.y);
            this.emit("stomp");
          }
        if (boss && boss.hp > 0 && overlap(shot, boss)) {
          this.hitBoss();
          shot.life = 0;
        }
      } else if (overlap(shot, p)) {
        this.hurt();
        shot.life = 0;
      }
    }
    this.shots = this.shots.filter((shot) => shot.life > 0 && shot.y < 600);
    if (!this.level.bonus)
      for (let i = 0; i < this.level.checkpoints.length; i++) {
        const at = this.level.checkpoints[i];
        if (p.x > at && i > this.checkpointIndex && p.grounded) {
          this.checkpointIndex = i;
          this.checkpoint = at;
          this.popup("checkpoint", at, FLOOR - 62);
          this.emit("checkpoint");
        }
      }
    if (
      input.down &&
      !this.lastDown &&
      Math.abs(p.x - this.level.pipe) < 55 &&
      p.grounded
    ) {
      if (this.level.bonus) this.exitBonus();
      else this.enterBonus();
    }
    this.lastDown = input.down;
    if (p.x + p.w > this.level.flag && p.y + p.h > FLOOR - 250) {
      if (this.level.bonus) this.exitBonus();
      else this.finishLevel();
    }
    const desired = Math.max(
      0,
      Math.min(this.level.width - this.viewWidth, p.x - this.viewWidth * 0.32),
    );
    this.camera += (desired - this.camera) * Math.min(1, dt * 7);
  }
}
