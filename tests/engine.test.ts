import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  generateLevel,
  emptyInput,
  normalizeSeed,
  seedHash,
  rng,
  FLOOR,
  TILE,
  WORLDS,
  type Input,
} from "../web/src/engine.ts";
const advance = (game: Game, seconds: number, input: Partial<Input> = {}) => {
  for (let i = 0; i < Math.round(seconds * 60); i++)
    game.update(1 / 60, { ...emptyInput(), ...input });
};
const fresh = () => {
  const game = new Game();
  game.start("POND-1985");
  advance(game, 0.1);
  return game;
};
const levelDigest = (seed: string, index: number) => {
  const l = generateLevel(seed, index);
  return JSON.stringify({
    tiles: [...l.tiles],
    enemies: l.enemies,
    flies: l.flies,
  });
};

test("same seed and stage reproduce terrain, power-ups and enemies exactly", () => {
  for (let i = 0; i < 8; i++)
    assert.equal(levelDigest("POND-1985", i), levelDigest("POND-1985", i));
  assert.notEqual(levelDigest("POND-1985", 0), levelDigest("MOSS-4242", 0));
  assert.notEqual(levelDigest("POND-1985", 0), levelDigest("POND-1985", 1));
  assert.equal(normalizeSeed("  moss-4242  "), "MOSS-4242");
  assert.equal(normalizeSeed("a".repeat(30)).length, 20);
});
test("200 seeds across eight levels have bounded gaps, safe starts, checkpoints and exits", () => {
  for (let n = 0; n < 200; n++)
    for (let i = 0; i < 8; i++) {
      const l = generateLevel(`QA-${n}`, i);
      let gap = 0;
      for (let c = 0; c < l.width / TILE; c++) {
        if (!l.tiles.has(`${c},15`)) gap++;
        else gap = 0;
        assert.ok(gap <= 4, `gap too wide seed ${n} stage ${i}`);
      }
      for (const x of [96, l.flag, ...l.checkpoints, l.pipe])
        assert.ok(l.tiles.has(`${Math.floor(x / TILE)},15`));
      assert.equal(Boolean(l.boss), i % 2 === 1);
      assert.ok(l.flies.length > 40);
      assert.ok(l.enemies.length > 8);
    }
});
test("random generator has a repeatable nonconstant sequence", () => {
  const a = rng(seedHash("x")),
    b = rng(seedHash("x"));
  const values = Array.from({ length: 100 }, () => a());
  assert.deepEqual(
    values,
    Array.from({ length: 100 }, () => b()),
  );
  assert.equal(new Set(values).size, 100);
  assert.ok(values.every((n) => n >= 0 && n < 1));
});
test("walk, run, friction and ground collision respond on fixed steps", () => {
  const g = fresh();
  advance(g, 0.5, { right: true });
  assert.ok(g.player.x > 170);
  assert.equal(g.player.y + g.player.h, FLOOR);
  assert.equal(g.player.vx, 205);
  advance(g, 0.5, { right: true, run: true });
  assert.equal(g.player.vx, 295);
  advance(g, 0.3);
  assert.equal(g.player.vx, 0);
});
test("holding jump reaches higher than a short tap", () => {
  const held = fresh(),
    tap = fresh();
  let heldY = held.player.y,
    tapY = tap.player.y;
  for (let i = 0; i < 60; i++) {
    held.update(1 / 60, { ...emptyInput(), jump: i < 28 });
    tap.update(1 / 60, { ...emptyInput(), jump: i < 3 });
    heldY = Math.min(heldY, held.player.y);
    tapY = Math.min(tapY, tap.player.y);
  }
  assert.ok(heldY + 30 < tapY, `held ${heldY} tap ${tapY}`);
  assert.equal(held.player.y + held.player.h, FLOOR);
});
test("late jump succeeds inside the coyote window", () => {
  const g = fresh();
  g.player.grounded = false;
  g.coyote = 0.08;
  g.player.y = FLOOR - 25;
  g.update(1 / 60, { ...emptyInput(), jump: true });
  assert.ok(g.player.vy < 0);
});
test("early jump is buffered until landing", () => {
  const g = fresh();
  g.player.y = FLOOR - g.player.h - 12;
  g.player.vy = 150;
  g.player.grounded = false;
  g.coyote = 0;
  advance(g, 0.1, { jump: true });
  assert.ok(g.player.vy < 0);
  assert.ok(g.player.y + g.player.h < FLOOR);
});
test("headbutt opens a question block and produces its real pickup", () => {
  const g = fresh();
  g.player.x = 12 * TILE + 3;
  advance(g, 0.45, { jump: true });
  assert.equal(g.level.tiles.get("12,11")?.kind, ":");
  assert.equal(g.pickups[0]?.type, "tea");
});
test("headbutt breaks bricks and scores", () => {
  const g = fresh();
  g.player.x = 13 * TILE + 3;
  advance(g, 0.45, { jump: true });
  assert.equal(g.level.tiles.has("13,11"), false);
  assert.equal(g.score, 10);
});
test("Tea grows Pepe and absorbs exactly one eligible hit", () => {
  const g = fresh();
  g.player.invulnerable = 0;
  g.collectPower("tea");
  assert.equal(g.player.h, 44);
  assert.equal(g.player.y + g.player.h, FLOOR);
  g.hurt();
  assert.equal(g.lives, 3);
  assert.equal(g.player.big, false);
  assert.equal(g.player.h, 30);
  g.hurt();
  assert.equal(g.lives, 3);
  g.player.invulnerable = 0;
  g.hurt();
  assert.equal(g.lives, 2);
  assert.equal(g.mode, "dying");
});
test("Fire Fly emits moving fireballs that defeat enemies", () => {
  const g = fresh();
  g.collectPower("fire");
  g.level.enemies = [
    {
      x: g.player.x + 95,
      y: FLOOR - 25,
      w: 27,
      h: 25,
      type: "snail",
      vx: 0,
      alive: true,
      home: g.player.x + 95,
      range: 0,
    },
  ];
  advance(g, 0.35, { fire: true });
  assert.equal(g.level.enemies[0].alive, false);
  assert.ok(g.score >= 200);
  assert.ok(g.events.some((e) => e.type === "fire"));
});
test("Lily Star prevents damage, defeats contact enemies, then expires", () => {
  const g = fresh();
  g.player.invulnerable = 0;
  g.collectPower("star");
  g.hurt();
  assert.equal(g.lives, 3);
  g.level.enemies = [
    {
      x: g.player.x,
      y: FLOOR - 25,
      w: 27,
      h: 25,
      type: "snail",
      vx: 0,
      alive: true,
      home: g.player.x,
      range: 0,
    },
  ];
  advance(g, 0.1);
  assert.equal(g.level.enemies[0].alive, false);
  advance(g, 9);
  assert.equal(g.player.star, 0);
  g.hurt();
  assert.equal(g.lives, 2);
});
test("beetles can be stomped and give a bounce and 100 points", () => {
  const g = fresh();
  const enemy = g.level.enemies[0];
  enemy.vx = 0;
  g.player.x = enemy.x;
  g.player.y = enemy.y - g.player.h - 3;
  g.player.vy = 180;
  g.player.grounded = false;
  advance(g, 0.05);
  assert.equal(enemy.alive, false);
  assert.equal(g.score, 100);
  assert.equal(g.stomps, 1);
  assert.ok(g.player.vy < 0);
});
test("snails cannot be stomped without a star", () => {
  const g = fresh();
  const enemy = g.level.enemies[0];
  enemy.type = "snail";
  enemy.vx = 0;
  g.player.invulnerable = 0;
  g.player.x = enemy.x;
  g.player.y = enemy.y - g.player.h - 3;
  g.player.vy = 180;
  g.player.grounded = false;
  advance(g, 0.05);
  assert.equal(enemy.alive, true);
  assert.equal(g.lives, 2);
});
test("water costs a life, returns to checkpoint, and three falls end the run", () => {
  const g = fresh();
  g.checkpoint = 960;
  for (let i = 0; i < 3; i++) {
    g.player.y = 650;
    advance(g, 1.5);
    assert.equal(g.lives, 2 - i);
    if (i < 2) assert.equal(g.player.x, 960);
  }
  assert.equal(g.mode, "gameover");
  assert.ok(
    g.events.some((e) => e.type === "gameover" && Number.isInteger(e.value)),
  );
  const score = g.score;
  advance(g, 10, { right: true, jump: true });
  assert.equal(g.score, score);
  assert.equal(g.mode, "gameover");
  g.start("POND-1985");
  assert.equal(g.lives, 3);
  assert.equal(g.mode, "playing");
  assert.equal(g.score, 0);
  assert.equal(g.index, 0);
});
test("pause freezes gameplay and resume continues", () => {
  const g = fresh();
  g.pause();
  const before = { x: g.player.x, time: g.time, elapsed: g.elapsed };
  advance(g, 5, { right: true, jump: true });
  assert.deepEqual({ x: g.player.x, time: g.time, elapsed: g.elapsed }, before);
  g.resume();
  advance(g, 0.5, { right: true });
  assert.ok(g.player.x > before.x);
});
test("nearby pipe input enters a bonus cave, exit restores the exact level and timer", () => {
  const g = fresh();
  const original = g.level;
  g.player.x = g.level.pipe;
  advance(g, 0.1, { down: true });
  assert.equal(g.level.bonus, true);
  assert.equal(g.bonusVisited, true);
  const originalTime = g.returnState!.time;
  const bonusFly = g.level.flies[0];
  g.player.x = bonusFly.x - 10;
  g.player.y = bonusFly.y - 15;
  advance(g, 0.02);
  assert.equal(bonusFly.taken, true);
  g.player.x = g.level.flag;
  advance(g, 0.02);
  assert.equal(g.level, original);
  assert.equal(g.returnState, undefined);
  assert.ok(Math.abs(g.time - originalTime) < 0.1);
});
test("bonus timeout safely returns instead of costing a life", () => {
  const g = fresh();
  g.enterBonus();
  g.time = 0.01;
  advance(g, 0.02);
  assert.equal(g.level.bonus, false);
  assert.equal(g.lives, 3);
});
test("guardian guards the flag, telegraphs shots, takes capped hits and awards score", () => {
  const g = fresh();
  g.index = 1;
  g.loadLevel();
  const b = g.level.boss!;
  g.player.x = b.home - 170;
  advance(g, 0.1);
  assert.equal(b.active, true);
  g.finishLevel();
  assert.equal(g.mode, "playing");
  const hp = b.hp;
  g.hitBoss();
  g.hitBoss();
  assert.equal(b.hp, hp - 1);
  while (b.hp) {
    b.hurt = 0;
    g.hitBoss();
  }
  assert.ok(g.score >= 1000);
  g.finishLevel();
  assert.equal(g.mode, "clear");
});
test("all eight stages transition, four bosses differ, final flag rescues the Lily", () => {
  const g = fresh();
  assert.equal(new Set(WORLDS.map((w) => w.art.join(""))).size, 4);
  for (let i = 0; i < 8; i++) {
    assert.equal(g.index, i);
    if (g.level.boss) {
      const b = g.level.boss;
      while (b.hp) {
        b.hurt = 0;
        g.hitBoss();
      }
    }
    g.player.x = g.level.flag;
    g.player.y = FLOOR - 100;
    advance(g, 0.02);
    if (i < 7) {
      assert.equal(g.mode, "clear");
      g.next();
    } else assert.equal(g.mode, "victory");
  }
  assert.ok(g.events.some((e) => e.type === "victory"));
  assert.ok(g.score > 4000);
});
test("higher flags and remaining time improve the score", () => {
  const low = fresh(),
    high = fresh();
  low.finishLevel();
  high.player.y -= 100;
  high.finishLevel();
  assert.ok(high.flagBonus > low.flagBonus);
  assert.equal(high.timeBonus, low.timeBonus);
});
test("real jump physics can cross the generator’s widest 4-tile water gap", () => {
  const g = fresh();
  g.level.enemies = [];
  g.level.tiles.forEach((t, k) => {
    if (t.r < 15) g.level.tiles.delete(k);
  });
  for (let c = 8; c < 12; c++)
    for (let r = 15; r < 18; r++) g.level.tiles.delete(`${c},${r}`);
  g.player.x = 160;
  advance(g, 0.15, { right: true, run: true });
  advance(g, 0.83, { right: true, run: true, jump: true });
  advance(g, 0.2, { right: true, run: true });
  assert.equal(g.lives, 3);
  assert.ok(g.player.x > 12 * TILE);
  assert.equal(g.player.y + g.player.h, FLOOR);
});

test("input-only playthrough completes all eight POND-1985 levels and four guardians", async () => {
  const { drive } = await import("./autoplay.ts");
  const g = fresh();
  const controller = { jumpFrames: 0 };
  let clears = 0;
  for (let frame = 0; frame < 60 * 600; frame++) {
    if (g.mode === "clear") {
      clears++;
      g.next();
      controller.jumpFrames = 0;
    }
    if (g.mode === "gameover" || g.mode === "victory") break;
    g.update(1 / 60, drive(g, controller));
    g.events = [];
  }
  assert.equal(g.mode, "victory");
  assert.equal(clears, 7);
  assert.equal(g.index, 7);
  assert.ok(g.score > 8000);
});
