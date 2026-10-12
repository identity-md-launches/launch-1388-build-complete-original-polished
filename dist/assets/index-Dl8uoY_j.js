(function() {
  "use strict";
  const TILE = 32;
  const FLOOR = 480;
  const TOTAL_LEVELS = 8;
  const emptyInput = () => ({
    left: false,
    right: false,
    jump: false,
    run: false,
    fire: false,
    down: false
  });
  const WORLDS = [
    {
      name: "Swamp",
      subtitle: "The whispering shallows",
      bg: "#101e1c",
      far: "#24443b",
      mid: "#396653",
      ground: "#76bb83",
      accent: "#a8edb5",
      boss: "Reed Warden",
      art: ["   \\___//   ", "  (o   o)  ", " /|#####|\\ ", "  /|___|\\  "]
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
      art: [" \\  /\\  / ", "(><(oo)><)", " /\\/==\\/\\ ", "   /  \\   "]
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
      art: ["    /^\\__  ", "  <(o o) > ", " /==/ \\==\\ ", " ~~~   ~~~ "]
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
      art: ["  \\|V|/   ", "  [o o]   ", " /{###}\\  ", " _/===\\_  "]
    }
  ];
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function seedHash(seed) {
    let hash = 2166136261;
    for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return hash >>> 0;
  }
  function rng(seed) {
    return () => {
      seed += 1831565813;
      let n = seed;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  function normalizeSeed(seed) {
    return seed.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
  }
  function randomSeed() {
    const words = ["LILY", "MOSS", "POND", "REED", "MIST", "FROG", "FERN", "BOG"];
    const a = new Uint32Array(2);
    globalThis.crypto.getRandomValues(a);
    return `${words[a[0] % words.length]}-${(a[1] % 1e4).toString().padStart(4, "0")}`;
  }
  const key = (c, r) => `${c},${r}`;
  function generateLevel(seed, index, bonus = false) {
    const random = rng(seedHash(`${seed}:${index}:${bonus}`));
    const length = bonus ? 38 : 288 + index * 8;
    const tiles = /* @__PURE__ */ new Map();
    const flies = [], enemies = [];
    const put = (c, r, kind, power) => tiles.set(key(c, r), { c, r, kind, power, bump: 0 });
    for (let c = 0; c < length; c++) for (let r = 15; r < 18; r++) put(c, r, "=");
    if (bonus) {
      for (let c = 5; c < 32; c += 2) {
        flies.push({
          x: c * TILE + 16,
          y: FLOOR - 56 - Math.sin(c * 0.35) * 56,
          taken: false
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
        bonus: true
      };
    }
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
      range: 80
    });
    const checkpoints = [];
    for (let start2 = 32; start2 < length - 34; start2 += 28) {
      const gap = 2 + Math.floor(random() * (index < 2 ? 2 : 3));
      const gapStart = start2 + 20;
      for (let c = gapStart; c < gapStart + gap; c++)
        for (let r = 15; r < 18; r++) tiles.delete(key(c, r));
      const elevated = random() > 0.45;
      if (elevated)
        for (let c = gapStart - 2; c < gapStart + gap + 1; c++) put(c, 12, "-");
      const blockCol = start2 + 4;
      put(blockCol, 11, "#");
      put(
        blockCol + 1,
        11,
        "?",
        ["tea", "fire", "star"][Math.floor(random() * 3)]
      );
      put(blockCol + 2, 11, "#");
      if (random() > 0.5) put(blockCol + 3, 8, "?", "star");
      for (let j = 0; j < 5; j++)
        flies.push({
          x: (gapStart - 1 + j) * TILE + 16,
          y: FLOOR - (elevated ? 144 : 80) - Math.sin(j / 4 * Math.PI) * 35,
          taken: false
        });
      const type = random() > 0.68 ? "snail" : "beetle";
      enemies.push({
        x: (start2 + 12) * TILE,
        y: FLOOR - 25,
        w: 27,
        h: 25,
        type,
        vx: (random() > 0.5 ? 1 : -1) * (type === "snail" ? 28 : 42 + index * 3),
        alive: true,
        home: (start2 + 12) * TILE,
        range: 72
      });
      if ((start2 - 32) % 84 === 0) checkpoints.push((start2 - 2) * TILE);
    }
    const pipe = 62 * TILE;
    for (let c = 60; c <= 65; c++) for (let r = 15; r < 18; r++) put(c, r, "=");
    const boss = index % 2 === 1 ? {
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
      active: false
    } : void 0;
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
      bonus: false
    };
  }
  class Game {
    mode = "title";
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
    level = generateLevel(this.seed, 0);
    player = this.freshPlayer();
    particles = [];
    pickups = [];
    shots = [];
    events = [];
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
    returnState;
    freshPlayer() {
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
        invulnerable: 0
      };
    }
    emit(type, text, value) {
      this.events.push({ type, text, value });
    }
    announce(text, duration = 3) {
      this.banner = text;
      this.bannerTimer = duration;
      this.emit("announce", text);
    }
    start(seed) {
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
      this.returnState = void 0;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.lastJump = false;
      this.lastDown = false;
      this.shotTimer = 0;
      this.stageScore = this.score;
      this.announce(
        `${Math.floor(this.index / 2) + 1}-${this.index % 2 + 1} / ${WORLDS[Math.floor(this.index / 2)].subtitle}`,
        3.8
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
    addScore(n, x, y) {
      this.score += Math.max(0, Math.floor(n));
      if (x !== void 0 && y !== void 0)
        this.popup(`+${n}`, x, y, "#ffe09b");
    }
    popup(text, x, y, color = "#a0f3bb") {
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: -34,
        text,
        color,
        life: 1.2,
        max: 1.2
      });
    }
    burst(x, y, text = "'", color = "#a0f3bb", count = 6) {
      for (let i = 0; i < count; i++)
        this.particles.push({
          x,
          y,
          vx: Math.cos(i * 2.4) * 65,
          vy: -40 - i * 12,
          text,
          color,
          life: 0.35 + i * 0.055,
          max: 0.7
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
    collectPower(type) {
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
        checkpoint: this.checkpoint
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
      this.returnState = void 0;
      this.shots = [];
      this.pickups = [];
      this.particles = [];
      this.player.invulnerable = 1;
      this.emit("pipe");
      this.announce("Back to the journey");
    }
    finishLevel() {
      if (this.mode !== "playing" || this.level.bonus || this.level.boss && this.level.boss.hp > 0)
        return;
      this.flagBonus = 100 + Math.min(
        900,
        Math.floor(Math.max(0, FLOOR - this.player.y - this.player.h) / 24) * 150
      );
      this.timeBonus = Math.floor(this.time) * 5;
      this.score += this.flagBonus + this.timeBonus;
      this.mode = this.index === TOTAL_LEVELS - 1 ? "victory" : "clear";
      this.emit(this.mode, void 0, this.score);
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
        this.addScore(1e3, boss.x, boss.y);
        this.emit("boss-dead");
        this.announce(
          this.index === 7 ? "The Golden Lily is free. Reach the flag!" : "Guardian defeated. Reach the flag!",
          5
        );
        this.shots = this.shots.filter((s) => !s.hostile);
      }
    }
    bump(tile) {
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
          life: 20
        });
        this.emit("block");
      } else if (tile.kind === "#") {
        this.level.tiles.delete(key(tile.c, tile.r));
        this.addScore(10);
        this.burst(tile.c * TILE + 16, tile.r * TILE, "#", "#cc9976", 6);
        this.emit("brick");
      }
    }
    nearby(rect) {
      const result = [];
      for (let c = Math.floor(rect.x / TILE); c <= Math.floor((rect.x + rect.w - 0.01) / TILE); c++)
        for (let r = Math.floor(rect.y / TILE); r <= Math.floor((rect.y + rect.h - 0.01) / TILE); r++) {
          const t = this.level.tiles.get(key(c, r));
          if (t) result.push(t);
        }
      return result;
    }
    update(dt, input) {
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
            this.emit("gameover", void 0, this.score);
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
              `${this.lives} ${this.lives === 1 ? "life" : "lives"} left / back at the reed marker`
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
      p.vy += 1550 * (input.jump && p.vy < 0 && this.jumpHeld < 0.24 ? 0.56 : 1) * dt;
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
        if (!fly.taken && overlap(p, { x: fly.x - 10, y: fly.y - 12, w: 22, h: 24 })) {
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
        (pickup) => pickup.life > 0 && pickup.y < 620
      );
      for (const enemy of this.level.enemies) {
        if (!enemy.alive || Math.abs(enemy.x - p.x) > this.viewWidth + 250)
          continue;
        const nextX = enemy.x + enemy.vx * dt;
        const edge = enemy.vx > 0 ? nextX + enemy.w : nextX;
        if (Math.abs(nextX - enemy.home) > enemy.range || !this.level.tiles.has(key(Math.floor(edge / TILE), 15)))
          enemy.vx *= -1;
        else enemy.x = nextX;
        if (overlap(p, enemy)) {
          if (p.star > 0 || enemy.type === "beetle" && p.vy > 0 && oldBottom <= enemy.y + 13) {
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
          hostile: false
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
            5
          );
        }
        boss.phase += dt;
        boss.cooldown -= dt;
        boss.hurt = Math.max(0, boss.hurt - dt);
        boss.x = boss.home + Math.sin(boss.phase * 1.4) * 95;
        if (boss.cooldown <= 0) {
          const direction2 = p.x < boss.x ? -1 : 1;
          this.shots.push({
            x: boss.x + boss.w / 2,
            y: FLOOR - 28,
            w: 19,
            h: 19,
            vx: direction2 * (165 + this.index * 6),
            vy: 0,
            life: 5,
            hostile: true
          });
          boss.cooldown = Math.max(1.35, 2.25 - this.index * 0.1);
          this.emit("boss-shot");
        }
        if (overlap(p, boss)) {
          if (p.star > 0 || p.vy > 0 && oldBottom <= boss.y + 20) {
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
      if (input.down && !this.lastDown && Math.abs(p.x - this.level.pipe) < 55 && p.grounded) {
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
        Math.min(this.level.width - this.viewWidth, p.x - this.viewWidth * 0.32)
      );
      this.camera += (desired - this.camera) * Math.min(1, dt * 7);
    }
  }
  class Renderer {
    canvas;
    ctx;
    game;
    width = 1152;
    height = 576;
    ratio = 1;
    reduced = false;
    clock = 0;
    stars = [];
    constructor(canvas2, game2) {
      this.canvas = canvas2;
      this.ctx = canvas2.getContext("2d", { alpha: false });
      this.game = game2;
      const random = rng(seedHash("odyssey-sky"));
      this.stars = Array.from({ length: 75 }, () => ({
        x: random() * 1800,
        y: random() * 350 + 14,
        n: random() * 9
      }));
      this.resize();
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.ratio = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(rect.width * this.ratio));
      this.canvas.height = Math.max(1, Math.round(rect.height * this.ratio));
      this.height = this.game.mode !== "title" && rect.width / Math.max(1, rect.height) > 2.2 ? 384 : 576;
      this.width = Math.max(
        360,
        rect.width / Math.max(1, rect.height) * this.height
      );
      this.game.viewWidth = this.width;
    }
    text(text, x, y, color, size = 24, alpha = 1) {
      const ctx = this.ctx;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.font = `${size}px "Space Mono", monospace`;
      ctx.textBaseline = "top";
      ctx.fillText(text, Math.round(x), Math.round(y));
      ctx.globalAlpha = 1;
    }
    art(lines, x, y, color, size = 20, lineHeight = 22) {
      lines.forEach(
        (line, i) => this.text(line, x, y + i * lineHeight, color, size)
      );
    }
    draw(dt) {
      if (!this.reduced && this.game.mode !== "paused") this.clock += dt;
      const g = this.game, ctx = this.ctx;
      const worldIndex = g.level.bonus ? 1 : Math.floor(g.index / 2);
      const world = WORLDS[worldIndex];
      ctx.setTransform(
        this.canvas.width / this.width,
        0,
        0,
        this.canvas.height / this.height,
        0,
        0
      );
      ctx.fillStyle = world.bg;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.save();
      const offsetY = 576 - this.height;
      ctx.translate(0, -offsetY);
      if (g.shake > 0 && !this.reduced)
        ctx.translate(
          Math.sin(this.clock * 137) * g.shake * 19,
          Math.cos(this.clock * 103) * g.shake * 13
        );
      const cam = this.reduced ? 0 : g.camera;
      for (const star of this.stars) {
        const x = ((star.x - cam * 0.08) % 1800 + 1800) % 1800;
        this.text(
          star.n > 7 ? "+" : ".",
          x,
          star.y,
          world.accent,
          star.n > 7 ? 16 : 13,
          0.22 + (this.reduced ? 0.15 : (Math.sin(this.clock * 0.7 + star.n) + 1) * 0.17)
        );
      }
      if (worldIndex === 1) {
        for (let i = -1; i < this.width / 170 + 2; i++) {
          const x = i * 170 - cam * 0.15 % 170;
          this.art(
            ["\\       /", " \\ VVV / ", "  \\ V /  ", "   \\V/   "],
            x,
            15,
            world.far,
            26,
            29
          );
          this.art(
            ["   /\\   ", "  /::\\  ", " /::::\\ ", "/::::::\\"],
            x + 80,
            346,
            world.mid,
            20,
            29
          );
        }
      } else {
        for (let i = -1; i < this.width / 350 + 2; i++) {
          const x = i * 350 - cam * 0.12 % 350;
          this.art(
            ["     .----.      ", "  .-(      )-.   ", " (____________)  "],
            x + 100,
            48 + i % 2 * 52,
            world.far,
            19,
            22
          );
          if (worldIndex === 3)
            this.art(
              [
                "  |^|      |^|  ",
                "  |#|______|#|  ",
                "  |##|####|##|  ",
                "  |##|#[]#|##|  ",
                " /|##|####|##|\\ "
              ],
              x,
              229,
              world.far,
              28,
              34
            );
          else
            this.art(
              [
                "       /\\       ",
                "      /..\\      ",
                "  /\\ /....\\ /\\ ",
                " /..V......V..\\",
                "/..............\\"
              ],
              x,
              263,
              world.far,
              28,
              34
            );
        }
      }
      for (let i = -1; i < this.width / 208 + 2; i++) {
        const x = i * 208 - cam * 0.32 % 208;
        if (worldIndex === 0)
          this.art(
            ["    |   /      ", "  \\|/  |/  |  ", " ~~|||~~||~~|~~"],
            x,
            366,
            world.mid,
            22,
            27
          );
        if (worldIndex === 2)
          this.art(
            ["   .(~~).  ", " (~~~~~~~~)", "  ~~~~~~~~ "],
            x,
            332 + i % 2 * 35,
            world.mid,
            24,
            28
          );
        if (worldIndex === 3)
          this.art(
            ["  |     |  ", " /#\\   /#\\ ", " |#|___|#| "],
            x,
            362,
            world.mid,
            22,
            28
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
      const start2 = Math.floor(g.camera / TILE) - 1;
      const end = start2 + Math.ceil(this.width / TILE) + 3;
      for (let c = start2; c < end; c++) {
        const x = c * TILE - g.camera;
        if (!g.level.tiles.has(`${c},15`)) {
          this.text(
            this.clock % 1 > 0.5 ? "~~" : "~≈",
            x,
            FLOOR + 1,
            "#79bde8",
            25
          );
          this.text(
            "~",
            x + 5,
            FLOOR + 27 + Math.sin(this.clock * 2 + c) * 2,
            "#397197",
            26
          );
          this.text(".", x + 12, FLOOR + 64, "#397197", 22);
        }
        for (let r = 0; r < 18; r++) {
          const tile = g.level.tiles.get(`${c},${r}`);
          if (!tile) continue;
          const y = r * TILE - (tile.bump > 0 ? Math.sin(tile.bump / 0.2 * Math.PI) * 7 : 0);
          if (tile.kind === "=") {
            this.text(
              r === 15 ? "≡" : (c + r) % 4 === 0 ? "#" : ":",
              x + 3,
              y - 2,
              r === 15 ? world.ground : world.mid,
              29,
              r === 15 ? 1 : 0.75
            );
          } else if (tile.kind === "-")
            this.text("===", x - 1, y - 9, world.accent, 18);
          else {
            const color = tile.kind === "?" ? "#ffdb7d" : tile.kind === "#" ? "#d19a77" : "#6e7d78";
            this.text(`[${tile.kind}]`, x - 1, y, color, 18);
          }
        }
      }
      for (const fly of g.level.flies)
        if (!fly.taken && fly.x > g.camera - 20 && fly.x < g.camera + this.width + 20) {
          this.text(
            "*",
            fly.x - g.camera - 9,
            fly.y - 13 + (this.reduced ? 0 : Math.sin(this.clock * 3 + fly.x) * 3),
            "#ffdf83",
            27
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
            19
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
          20
        );
        if (Math.abs(g.player.x - g.level.pipe) < 110 && (!g.bonusVisited || g.level.bonus))
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
              "|    "
            ],
            fx,
            FLOOR - 240,
            "#ffe09b",
            22,
            24
          );
          this.text(
            g.level.boss && g.level.boss.hp > 0 ? "defeat guardian" : "homeward →",
            fx - 58,
            FLOOR - 273,
            world.accent,
            15
          );
        }
        if (g.index === 0 && g.camera < 850) {
          this.text("← A / D →", 95 - g.camera, FLOOR - 100, "#a8c4b2", 16);
          this.text("hold jump ↗", 385 - g.camera, FLOOR - 206, "#c4d4be", 16);
          this.text("stomp ↓", 729 - g.camera, FLOOR - 109, "#ffb7ac", 15);
        }
      }
      for (const enemy of g.level.enemies)
        if (enemy.alive && enemy.x > g.camera - 80 && enemy.x < g.camera + this.width + 80) {
          const ex = enemy.x - g.camera;
          this.text(
            enemy.type === "beetle" ? "ö" : "§",
            ex,
            enemy.y - 10,
            "#ff8e92",
            34
          );
          this.text(
            enemy.type === "beetle" ? Math.sin(this.clock * 10) > 0 ? "/\\" : "\\/" : "^",
            ex + 2,
            enemy.y + 18,
            "#e8757b",
            13
          );
        }
      for (const pickup of g.pickups) {
        const symbol = pickup.type === "tea" ? "T" : pickup.type === "fire" ? "&" : "*";
        this.text(
          symbol,
          pickup.x - g.camera,
          pickup.y - 4,
          pickup.type === "tea" ? "#f4bf89" : pickup.type === "fire" ? "#ff9d74" : "#d1b7ff",
          29
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
          21
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
            18
          );
        }
      }
      for (const shot of g.shots)
        this.text(
          shot.hostile ? "x" : "o",
          shot.x - g.camera,
          shot.y - 5,
          shot.hostile ? "#ff8e92" : "#ffdc89",
          23
        );
      const p = g.player;
      const invisible = p.invulnerable > 0 && Math.floor(this.clock * 12) % 2 === 0;
      {
        let color = p.fire ? "#ffe09b" : "#a8f3bd";
        if (p.star > 0)
          color = this.reduced ? "#ffffff" : ["#a8f3bd", "#ffe09b", "#d9b4ff", "#9cd7fc"][Math.floor(this.clock * 5) % 4];
        if (g.mode === "dying") color = "#ff8e92";
        this.text(
          g.mode === "dying" ? "x" : "@",
          p.x - g.camera - 1,
          p.y - (p.big ? 9 : 8),
          color,
          p.big ? 46 : 34,
          invisible && !this.reduced ? 0.45 : 1
        );
        if (p.grounded && Math.abs(p.vx) > 40)
          this.text(
            this.clock % 0.3 > 0.15 ? "' '" : " . ",
            p.x - g.camera - 3,
            p.y + p.h - 4,
            color,
            11
          );
      }
      for (const fx of g.particles)
        this.text(
          fx.text,
          fx.x - g.camera,
          fx.y,
          fx.color,
          fx.text.length > 1 ? 16 : 21,
          Math.min(1, fx.life * 3)
        );
      if (g.bannerTimer > 0 && !boss?.active) {
        const size = this.width < 700 ? 13 : 16;
        ctx.font = `${size}px "Space Mono", monospace`;
        const lines = [""];
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
        lines.forEach(
          (line, i) => this.text(
            line,
            Math.max(20, (this.width - ctx.measureText(line).width) / 2),
            23 + offsetY + i * 20,
            world.accent,
            size
          )
        );
      }
      ctx.restore();
    }
    drawTitleScene() {
      const world = WORLDS[0];
      const compact = this.width < 720;
      const start2 = compact ? this.width - 180 : this.width * 0.59;
      const y = 416;
      this.art(
        [
          "        .         +         ",
          "    +         .             ",
          "                __          ",
          "       _     __(  )__       ",
          "      ( )   (________)      "
        ],
        start2 - 20,
        128,
        "#466e5a",
        18,
        24
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
          "   /____/        \\____\\  "
        ],
        start2 - (compact ? 4 : 45),
        compact ? 365 : 171,
        "#9be4ac",
        compact ? 8 : 16,
        compact ? 9 : 18
      );
      this.text(
        "*",
        start2 + (compact ? 134 : 235),
        (compact ? 418 : 246) + Math.sin(this.clock * 2) * 6,
        "#ffdb7d",
        compact ? 18 : 31
      );
      this.text(
        "*",
        start2 - 60,
        (compact ? 432 : 302) + Math.sin(this.clock * 2 + 1) * 6,
        "#ffdb7d",
        26
      );
      this.art(
        ["[?] [#] [?]", "           "],
        start2 + (compact ? -134 : 222),
        compact ? 435 : y - 77,
        "#ffdb7d",
        19,
        24
      );
      this.text("@", start2 + 89, y - 26, "#a8f3bd", 34);
      this.text("ö", start2 + 280, y + 11, "#ff8e92", 34);
      this.art(
        ["|>***", "| >> ", "|    ", "|    ", "|    "],
        this.width - 56,
        compact ? y + 20 : y - 28,
        "#ffe09b",
        17,
        20
      );
      for (let x = 0; x < this.width; x += 32) {
        const pond = x > start2 + 154 && x < start2 + 252;
        this.text(
          pond ? "~" : "≡",
          x,
          y + 47,
          pond ? "#79bde8" : world.ground,
          28
        );
        this.text(
          pond ? "~" : ":",
          x + 7,
          y + 79,
          pond ? "#397197" : world.mid,
          25
        );
        this.text(
          pond ? "." : x % 64 ? ":" : "#",
          x + 3,
          y + 112,
          pond ? "#397197" : world.far,
          25
        );
      }
      this.text("||", start2 - 70, y + 14, "#9aba87", 29);
    }
  }
  class Synth {
    context;
    master;
    muted = false;
    active = false;
    step = 0;
    next = 0;
    world = 0;
    async unlock() {
      try {
        if (!this.context) {
          this.context = new AudioContext();
          this.master = this.context.createGain();
          this.master.gain.value = this.muted ? 0 : 0.15;
          this.master.connect(this.context.destination);
        }
        if (this.context.state === "suspended") await this.context.resume();
      } catch {
      }
    }
    setMute(muted) {
      this.muted = muted;
      if (this.master && this.context)
        this.master.gain.setTargetAtTime(
          muted ? 0 : 0.15,
          this.context.currentTime,
          0.02
        );
    }
    tone(freq, duration, type = "square", volume = 0.18, delay = 0, slide = 0) {
      if (!this.context || !this.master || this.context.state !== "running" || this.muted)
        return;
      const t = this.context.currentTime + delay;
      const osc = this.context.createOscillator(), gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide)
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(25, freq + slide),
          t + duration
        );
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 8e-3);
      gain.gain.exponentialRampToValueAtTime(1e-3, t + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.015);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
    effect(name) {
      if (name === "jump") this.tone(240, 0.13, "square", 0.2, 0, 400);
      if (name === "fly") {
        this.tone(880, 0.08);
        this.tone(1320, 0.12, "square", 0.17, 0.065);
      }
      if (name === "stomp" || name === "brick")
        this.tone(145, 0.14, "triangle", 0.6, 0, -90);
      if (name === "fire") this.tone(520, 0.12, "sawtooth", 0.12, 0, -390);
      if (name === "hurt" || name === "death") {
        this.tone(240, 0.3, "sawtooth", 0.28, 0, -185);
        this.tone(80, 0.25, "triangle", 0.4, 0.12);
      }
      if (name === "power" || name === "checkpoint")
        [330, 440, 550, 660].forEach(
          (n, i) => this.tone(n, 0.12, "square", 0.15, i * 0.07)
        );
      if (name === "block" || name === "pipe")
        this.tone(420, 0.18, "triangle", 0.4, 0, -250);
      if (name === "boss-hit") this.tone(120, 0.25, "sawtooth", 0.4, 0, -70);
      if (name === "clear" || name === "victory" || name === "boss-dead")
        [523, 659, 784, 1047].forEach(
          (n, i) => this.tone(n, 0.3, "square", 0.2, i * 0.12)
        );
    }
    update(playing, world) {
      if (!this.context || this.context.state !== "running") return;
      this.active = playing;
      this.world = world;
      if (!playing || this.muted) {
        this.next = this.context.currentTime;
        return;
      }
      const now = this.context.currentTime;
      if (this.next < now - 0.5) this.next = now;
      const melody = [0, 7, 12, 7, 3, 10, 14, 10, 5, 12, 15, 12, 7, 10, 14, 7];
      while (this.next < now + 0.08) {
        const transpose = [0, -3, 5, -5][world];
        const note = melody[this.step % melody.length] + transpose;
        const freq = 261.63 * 2 ** (note / 12);
        const delay = Math.max(0, this.next - now);
        this.tone(freq, 0.115, "triangle", 0.16, delay);
        if (this.step % 4 === 0)
          this.tone(65.4 * 2 ** (transpose / 12), 0.24, "triangle", 0.28, delay);
        if (this.step % 4 === 2) this.tone(42, 0.07, "square", 0.08, delay, -12);
        this.next += world === 3 ? 0.17 : 0.19;
        this.step++;
      }
    }
  }
  class SafeStore {
    memory = /* @__PURE__ */ new Map();
    available = true;
    constructor() {
      try {
        const k = "pepe-odyssey-probe";
        localStorage.setItem(k, "1");
        localStorage.removeItem(k);
      } catch {
        this.available = false;
      }
    }
    get(key2, fallback = "") {
      try {
        return (this.available ? localStorage.getItem(`odyssey:${key2}`) : this.memory.get(key2)) ?? fallback;
      } catch {
        this.available = false;
        return this.memory.get(key2) ?? fallback;
      }
    }
    set(key2, value) {
      this.memory.set(key2, value);
      try {
        if (this.available) localStorage.setItem(`odyssey:${key2}`, value);
      } catch {
        this.available = false;
      }
    }
    best(seed) {
      const n = Number(this.get(`best:${seed}`, "0"));
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    }
    saveBest(seed, score) {
      const best2 = Math.max(this.best(seed), score);
      this.set(`best:${seed}`, String(best2));
      return best2;
    }
  }
  function connectBridge(callbacks) {
    let channel;
    const receive = (event) => {
      if (event.source !== parent || !event.data || event.data.protocol !== "pepe-game/1")
        return;
      const message = event.data;
      if (message.type === "init" && typeof message.channel === "string" && message.channel.length > 0 && message.channel.length <= 200) {
        channel = message.channel;
        parent.postMessage(
          { protocol: "pepe-game/1", type: "ready", channel },
          "*"
        );
      }
      if (!channel || message.channel !== channel) return;
      if (message.type === "pause") callbacks.pause();
      if (message.type === "resume") callbacks.resume();
    };
    window.addEventListener("message", receive);
    return {
      score(score) {
        if (channel && Number.isSafeInteger(score) && score >= 0)
          parent.postMessage(
            { protocol: "pepe-game/1", type: "score", channel, score },
            "*"
          );
      }
    };
  }
  const $ = (id) => document.getElementById(id);
  document.body.classList.toggle("touch-device", navigator.maxTouchPoints > 0);
  const game = new Game();
  const store = new SafeStore();
  const synth = new Synth();
  const canvas = $("canvas");
  const renderer = new Renderer(canvas, game);
  const panel = $("panel");
  const titleMarkup = panel.innerHTML;
  const keys = /* @__PURE__ */ new Set();
  const pointers = /* @__PURE__ */ new Map();
  let jumpPressed = false;
  let firePressed = false;
  let downPressed = false;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let scanlines = store.get("crt", "true") === "true";
  let lastMode = "title";
  let displayedMode = "";
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
    document.querySelectorAll("[data-control]").forEach((b) => b.classList.remove("held"));
  }
  function pause() {
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
  function start(seed) {
    void synth.unlock();
    clearInput();
    game.start(seed);
    best = store.best(game.seed);
    displayedMode = "";
    sync();
    canvas.focus({ preventScroll: true });
  }
  function openDialog(id) {
    clearInput();
    resumeAfterDialog = game.mode === "playing";
    if (resumeAfterDialog) game.pause();
    $(id).showModal();
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
    $("storage-note").textContent = store.available ? "Your best, saved per seed." : "Best scores last for this session.";
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
    $("share-input").value = game.seed;
    $("copy-status").textContent = "";
    openDialog("share-dialog");
    $("share-input").select();
  });
  $("copy-seed").addEventListener("click", async () => {
    const field = $("share-input");
    try {
      await navigator.clipboard.writeText(field.value);
      $("copy-status").textContent = "Seed copied. A new adventure to share.";
    } catch {
      field.focus();
      field.select();
      $("copy-status").textContent = "Select the seed above and copy it with your device’s copy command.";
    }
  });
  $("confirm-restart").addEventListener("click", () => {
    resumeAfterDialog = false;
    $("restart-dialog").close();
    start(game.seed);
  });
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.querySelectorAll("[data-close]").forEach(
      (button) => button.addEventListener("click", () => dialog.close())
    );
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
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
    $("seed-input").value = "";
    $("seed-input").removeAttribute("aria-invalid");
    openDialog("seed-dialog");
    $("seed-input").focus();
  }
  $("seed-input").addEventListener("input", () => {
    const seed = normalizeSeed($("seed-input").value);
    $("seed-best").textContent = store.best(seed) ? `Best on this seed: ${store.best(seed).toLocaleString()}` : "";
    $("seed-input").removeAttribute("aria-invalid");
    $("seed-error").textContent = "";
  });
  $("seed-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const field = $("seed-input");
    const seed = field.value.trim().toUpperCase();
    if (!/^[A-Z0-9-]{1,20}$/.test(seed)) {
      field.setAttribute("aria-invalid", "true");
      $("seed-error").textContent = "Use 1–20 letters, numbers or hyphens to name your run.";
      field.focus();
      return;
    }
    resumeAfterDialog = false;
    $("seed-dialog").close();
    start(seed);
  });
  panel.addEventListener("click", (event) => {
    const action = event.target.closest(
      "[data-action]"
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
    "ShiftRight"
  ];
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector("dialog[open]"))
      return;
    if (["INPUT", "TEXTAREA"].includes(event.target?.tagName))
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
  for (const button of document.querySelectorAll(
    "[data-control]"
  )) {
    const control = button.dataset.control;
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
    const release = (event) => {
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(control))
        button.classList.remove("held");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  function readInput() {
    const touch = new Set(pointers.values());
    const input = emptyInput();
    input.left = keys.has("KeyA") || keys.has("ArrowLeft") || touch.has("left");
    input.right = keys.has("KeyD") || keys.has("ArrowRight") || touch.has("right");
    input.jump = keys.has("Space") || keys.has("KeyW") || keys.has("ArrowUp") || touch.has("jump") || jumpPressed;
    input.run = keys.has("ShiftLeft") || keys.has("ShiftRight") || touch.has("left") || touch.has("right");
    input.fire = keys.has("KeyJ") || keys.has("KeyX") || touch.has("fire") || firePressed;
    input.down = keys.has("KeyS") || keys.has("ArrowDown") || touch.has("down") || downPressed;
    jumpPressed = false;
    firePressed = false;
    downPressed = false;
    return input;
  }
  function resultStats() {
    return `<div class="result-stats"><p><strong>${game.score.toLocaleString()}</strong>Score</p><p><strong>${game.totalFlies}</strong>Flies</p><p><strong>${Math.floor(game.elapsed / 60)}:${Math.floor(
      game.elapsed % 60
    ).toString().padStart(2, "0")}</strong>Run time</p></div>`;
  }
  function sync() {
    const mode = game.mode, title = mode === "title";
    document.body.classList.toggle("in-run", !title);
    $("run-title").hidden = title;
    $("pause").hidden = title || !["playing", "paused"].includes(mode);
    $("pause").textContent = mode === "paused" ? "▷" : "Ⅱ";
    $("pause").setAttribute(
      "aria-label",
      mode === "paused" ? "Resume game" : "Pause game"
    );
    panel.hidden = mode === "playing" || mode === "dying";
    if (displayedMode !== mode) {
      displayedMode = mode;
      panel.className = title ? "game-panel title-panel" : "game-panel";
      if (title) panel.innerHTML = titleMarkup;
      if (mode === "paused")
        panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">  z Z
 ( @ )
 /___\\</pre><h2>Pond on pause.</h2><p class="subtitle">Your adventure will keep.</p><div class="center-actions"><button type="button" class="primary" data-action="resume">Resume run <span aria-hidden="true">→</span></button><button type="button" data-action="restart">Restart this seed</button></div><button type="button" class="subtle-action" data-action="help">Read the field guide</button></div>`;
      if (mode === "clear")
        panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">  |>***
  | >>
@_|___</pre><h2>${game.index % 2 ? "World" : "Level"} complete.</h2><p class="subtitle">${WORLDS[Math.floor(game.index / 2)].name} ${Math.floor(game.index / 2) + 1}-${game.index % 2 + 1} / a little closer to the Lily.</p>${resultStats()}<p class="subtitle">Flag +${game.flagBonus} · Time +${game.timeBonus}</p><div class="center-actions"><button type="button" class="primary" data-action="next">Next level →</button></div><p class="run-note">${game.index + 1} of 8 levels complete · ${game.lives} ${game.lives === 1 ? "life" : "lives"} left</p></div>`;
      if (mode === "gameover")
        panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">    .-.
   ( x )
 ~~~|~~~</pre><h2>The pond remembers.</h2><p class="subtitle">Out of lives. There’s always another hop.</p>${resultStats()}<p class="subtitle">Seed ${game.seed} · Best ${best.toLocaleString()}</p><div class="center-actions"><button type="button" class="primary" data-action="retry">Try this seed again →</button><button type="button" data-action="new">New random run</button></div><button type="button" class="subtle-action" data-action="title">Back to title</button></div>`;
      if (mode === "victory")
        panel.innerHTML = `<div class="center-content"><pre class="result-art" aria-hidden="true">  \\ | /
 --\\*/--
   /|\\
    |
 ~~(@)~~</pre><h2>The Lily is home.</h2><p class="subtitle">Eight levels. Four guardians. One very brave frog.</p>${resultStats()}<p class="subtitle">Seed ${game.seed} · Best ${best.toLocaleString()}</p><div class="center-actions"><button type="button" class="primary" data-action="new">A new odyssey →</button><button type="button" data-action="retry">Replay this seed</button></div><button type="button" class="subtle-action" data-action="title">Back to title</button></div>`;
      renderer.resize();
      if (["paused", "clear", "gameover", "victory"].includes(mode))
        panel.querySelector(".primary")?.focus({ preventScroll: true });
    }
    $("score").textContent = (title ? 0 : game.score).toString().padStart(6, "0");
    $("lives").textContent = title ? "@ @ @" : Array.from({ length: 3 }, (_, i) => i < game.lives ? "@" : "·").join(
      " "
    );
    $("lives").setAttribute("aria-label", `${title ? 3 : game.lives} lives`);
    $("world-label").textContent = game.level.bonus ? "Bonus cave" : WORLDS[Math.floor(game.index / 2)].name;
    $("world").textContent = `${String(Math.floor(game.index / 2) + 1).padStart(2, "0")}—0${game.index % 2 + 1}`;
    $("time").textContent = String(Math.max(0, Math.ceil(game.time)));
    $("time").classList.toggle("danger", game.time < 30);
    $("seed-display").textContent = title ? "New adventure" : game.seed;
    $("seed-display").setAttribute(
      "aria-label",
      title ? "Enter a run seed" : `Run seed ${game.seed}. View and copy`
    );
    $("best-label").textContent = !title && best ? `/ best ${best}` : "";
    document.querySelectorAll("[data-world]").forEach((stop) => {
      const current = Number(stop.dataset.world) === Math.floor(game.index / 2);
      stop.classList.toggle("current", current);
      if (current) stop.setAttribute("aria-current", "step");
      else stop.removeAttribute("aria-current");
    });
    const power = game.player.star > 0 ? `* Lily Star · ${Math.ceil(game.player.star)}s` : game.player.fire ? "& Fire Fly · J / X to fire" : game.player.big ? "T Mushroom Tea · shield ready" : "";
    $("power-status").textContent = power;
    $("power-status").hidden = !power || mode !== "playing";
    $("death-note").hidden = mode !== "dying";
    $("death-note").textContent = game.lives > 0 ? `${game.lives} ${game.lives === 1 ? "life" : "lives"} left` : "One last ripple…";
    $("pipe-button").hidden = mode !== "playing" || Math.abs(game.player.x - game.level.pipe) > 90 || game.bonusVisited && !game.level.bonus;
    $("fire-button").disabled = !game.player.fire || mode !== "playing";
    canvas.dataset.mode = mode;
    canvas.setAttribute(
      "aria-label",
      `ASCII platformer. ${WORLDS[Math.floor(game.index / 2)].name}, level ${game.index % 2 + 1}. Score ${game.score}. ${game.lives} lives. ${mode === "paused" ? "Paused." : "A and D to move, Space to jump, P to pause."}`
    );
    updateSettings();
  }
  let previous = performance.now(), accumulator = 0;
  function frame(now) {
    const delta = Math.min((now - previous) / 1e3, 0.1);
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
          hideHintsAt = now + 5e3;
        }
        if (event.type === "clear" || event.type === "gameover" || event.type === "victory") {
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
  new ResizeObserver(() => renderer.resize()).observe($("stage"));
  document.fonts.ready.then(() => renderer.resize());
  updateSettings();
  sync();
  requestAnimationFrame(frame);
})();
