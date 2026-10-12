# Pepe Bros. ASCII Odyssey

A complete, original, single-player ASCII platformer for the Pepe2Pepe arcade. Play the static export in **`dist/index.html`**. Everything needed to play is local: code, fonts, character art, cover and synthesized chiptunes. No account, wallet, payment, API or CDN is used.

Choose **New run** for a random seed, or **Enter seed** to replay a shared adventure. Rescue the Golden Lily through eight levels: two each in the Swamp, Caves, Sky Pads and Bog Castle. Each world ends with a different ASCII guardian. You get three lives; reed markers are checkpoints. After game over, **Try this seed again** restarts immediately.

## Play

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | A / D or ← / → | Hold the direction buttons |
| Jump | Space, W or ↑; hold for height | Hold Jump for height |
| Run | Shift | Automatic while holding a direction |
| Fire | J or X, after finding Fire Fly | Fire, after finding Fire Fly |
| Secret pipe | S or ↓ near `\|\|` | Pipe button appears nearby |
| Pause / resume | P or Esc | Pause button / Resume run |

Collect `*` flies for 10 points. Headbutt `[?]` to release a power-up; headbutt `[#]` to break it. `T` Mushroom Tea makes Pepe big and absorbs one hit. `&` Fire Fly adds bouncing fireballs. `*` Lily Star grants nine seconds of invincibility. Stomp `ö` beetles for 100 points; jump over `§` snails and blue `~` water. A guardian's `!` warns of its next projectile. Stomp its head or use fireballs. Reach the flag after defeating it.

Higher flag grabs and remaining time add points. Secret pipes lead to a 25-second bonus cave; reach its exit or let its timer return you safely. Best scores are saved per seed, and mute/CRT preferences are remembered where storage is available. In an opaque iframe or a browser that blocks storage, these work in memory for the current page session. Select the seed in the HUD to copy it; a selectable text fallback works when the clipboard API is unavailable.

The 8–12 minute pacing target assumes exploration, power-ups and bonus caves. A practiced, always-running route is shorter: the automated keyboard playthrough finished in about 4:47. Real novice completion times have not been user-tested. Landscape is recommended on phones, but portrait remains playable.

## Install, preview and rebuild

Use Node **22.13 or newer** (the checks used 22.23.3) and npm. Build dependencies and browser-test tools are pinned in `web/package-lock.json`.

```sh
cd web
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. `build` writes **repository-root `dist/`**; `preview` serves that production export. For source development, use `npm run dev`. Normal installation creates `web/node_modules`; keep dependency/cache directories out of any submission. This build installed all tools under `/tmp`, so no dependency directory or ignore-file modification is included here.

To serve the already-built export without installing anything:

```sh
python3 -m http.server 8080 --directory dist
```

Then open `http://localhost:8080/`. An HTTP server is recommended for consistent browser behavior. All asset URLs are relative, so the export also works under a static-host subdirectory. There is no server-side routing or backend.

## Run browser checks

After `npm ci` in `web`, install Chromium once:

```sh
cd web
npx playwright install chromium
npm run test:browser
npm run test:campaign
node ../scripts/browser-mechanics.mjs
npm run check:export
```

Each browser script starts and closes its own foreground HTTP preview and browser. Tests serve the **production `dist/`** at `/arcade/odyssey/`, including an exact `allow-scripts allow-pointer-lock` iframe without CORS headers. No preview service is left running.

The campaign controller observes the engine and sends ordinary keyboard events. Its clock is accelerated; it never teleports the player, edits health, skips stages or calls physics updates directly. Separate mechanics tests intentionally use state fixtures for collisions, game over and rare states. To observe internals, those tests add a reference only to the intercepted browser response. **No test globals, cheats or automation code ship in `dist/`.**

For tools installed outside the repository, set `PEPE_TEST_TOOLS` to the installation directory containing `package.json`/`node_modules`, and `PLAYWRIGHT_BROWSERS_PATH` to its browser cache. This build used `/tmp/pepe-browser-tools` and `/tmp/pepe-browsers`.

## Actual validation

- Production build and strict TypeScript check passed.
- **23 engine tests** passed, including 200 seeds × 8 levels, collision/power-up/life/pause/score mechanics and a complete input-only campaign. See [engine-tests.tap](artifacts/engine-tests.tap).
- Chromium browser interactions and the storage-denied iframe bridge passed. See [browser-results.json](artifacts/browser-results.json).
- All eight stages and four guardians were completed through keyboard events, followed by replay. See [playthrough-results.json](artifacts/playthrough-results.json) and [victory screenshot](artifacts/campaign-victory.png).
- A fresh external checkout of the source installed from the lockfile using an existing offline npm cache, typechecked and rebuilt to byte-identical export files. See [rebuild-results.json](artifacts/rebuild-results.json).
- All six Better Interface domains were reviewed. Findings, corrections, screenshots and honest coverage limits are in [artifacts/validation.md](artifacts/validation.md).
- The final manifest, local assets and submission size are checked by [scripts/check-export.mjs](scripts/check-export.mjs); results and export hashes are in [export-check.json](artifacts/export-check.json).

These are worker-run checks, not independent certification. Chromium automation is not a physical-device test, a screen-reader session or an audible listening review. Safari, Firefox, native 200% browser zoom and real phone performance were not checked. Menus have semantic controls and keyboard support; the spatial platforming itself is visual. There is no cross-device cloud save or trusted leaderboard.

## Implementation

- `web/src/engine.ts`: deterministic generation, fixed-step physics, collisions, scoring and state machine.
- `web/src/render.ts`: all character art, four palettes, parallax, effects and viewport framing.
- `web/src/main.ts`: menus, keyboard/pointer input, focus, settings and the animation loop.
- `web/src/audio.ts`: original oscillator-based music and effects; gesture-gated AudioContext.
- `web/src/bridge.ts`: `pepe-game/1` source/channel validation and score messages.
- `web/src/storage.ts`: guarded persistence with an in-memory fallback.
- `web/src/style.css` and [DESIGN.md](DESIGN.md): implemented visual system and responsive behavior.
- `web/public/pepe-game.json`: the `pepe-browser-game/1` manifest.
- `web/public/cover.svg`: original, self-contained 1200×630 cover. Regenerate with `node scripts/create-cover.mjs` from the repository root, then rebuild.

Vite uses `base: './'`. Production is a classic deferred IIFE script, with font bytes embedded in the CSS. This deliberately supports an opaque-origin iframe even when the static server provides no CORS headers. Source remains modular TypeScript. The runtime has no library dependencies.

## Publish and arcade integration

Deliver the **entire `dist/` directory**, alongside source, lockfile and documentation. The IdentityMD Swarm publishes that export after this build is handed off; this build does not deploy or call the release helper. Do not upload `node_modules`, package-manager caches, browser downloads or `test/scratch`.

After Swarm returns the hosting result, the coordinating creator can use the [Pepe2Pepe template's release workflow](https://github.com/adaki2004/pepe2pepe-game-template/blob/main/INTEGRATION.md) outside this build. Admin review happens afterward. **No publication URL, submission receipt or approval is claimed here.**

The parent must send `{ protocol: 'pepe-game/1', type: 'init', channel: '…' }`. The game replies with `ready`; matching parent/channel `pause` and `resume` messages control play. On game over or victory it sends a finite, nonnegative integer `score`. Messages contain no secrets. Scores are display hints, not verified competitive results. Page visibility loss also pauses play.

See [ASSETS.md](ASSETS.md) for original work, font licenses and design-guide attribution.
