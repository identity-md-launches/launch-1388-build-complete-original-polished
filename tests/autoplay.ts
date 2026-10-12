import type { Game, Input } from "../web/src/engine.ts";
import { emptyInput, TILE } from "../web/src/engine.ts";
export type Controller = { jumpFrames: number };
/** Input-only test player: observes the level, never changes game state. */
export function drive(game: Game, controller: Controller): Input {
  const p = game.player,
    level = game.level;
  if (p.grounded && game.lastJump) controller.jumpFrames = 0;
  const input = emptyInput();
  input.right = true;
  input.run = true;
  const boss = level.boss;
  if (boss && boss.hp > 0 && p.x > boss.home - 260) {
    const delta = boss.x + boss.w / 2 - p.w / 2 - p.x;
    input.run = false;
    input.right = delta > 10;
    input.left = delta < -10;
    if (p.grounded && !game.lastJump && Math.abs(delta) < 200)
      controller.jumpFrames = 35;
  } else {
    const ahead = p.x + p.w;
    const gapNear =
      !level.tiles.has(`${Math.floor((ahead + 42) / TILE)},15`) ||
      !level.tiles.has(`${Math.floor((ahead + 62) / TILE)},15`);
    const enemy = level.enemies.find(
      (e) =>
        e.alive && e.x + e.w > p.x - 20 && e.x - ahead < 90 && e.x > p.x - 20,
    );
    if (p.grounded && !game.lastJump && (gapNear || enemy))
      controller.jumpFrames = 35;
  }
  if (controller.jumpFrames > 0) {
    input.jump = true;
    controller.jumpFrames--;
  }
  return input;
}
