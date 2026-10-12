# Validation record: Pepe Bros. ASCII Odyssey

Worker-run checks against the committed `dist/` export and the final source. Every file named here sits in this `evidence/` directory, next to this note. The directory is called `evidence/` rather than `artifacts/` because the workspace's Git exclude file (`.git/info/exclude`, which this build may not edit) hides every `artifacts/` directory; the first round wrote its logs there and they were never committed.

## Commands and results

| Check | Command (from `web/`) | Result | Record |
| --- | --- | --- | --- |
| Strict TypeScript | `npm run typecheck` | passed, no diagnostics | this note |
| Production build | `npm run build` | passed; `dist/index.html`, one CSS and one classic deferred JS file | `rebuild-results.json` hashes |
| Engine tests | `npm test` (TAP reporter) | 23 passed, 0 failed | `engine-tests.tap` |
| Browser interactions | `npm run test:browser` | 17 checks passed, 0 console/page/resource errors, Chrome Headless Shell 145.0.7632.6 | `browser-results.json`, screenshots listed inside it |
| Campaign playthrough | `npm run test:campaign` | victory on seed POND-1985 through keyboard events only; 8 stages, 4 guardians, 3 lives kept, score 11,955, 4:47 game time; one-click replay restores stage 1 with 3 lives | `playthrough-results.json`, `campaign-victory.png`, `world-1.png` … `world-4.png` |
| Mechanics fixtures | `node ../scripts/browser-mechanics.mjs` | 6 checks passed | `mechanics-results.json`, `bonus-cave.png`, `boss-1.png` … `boss-4.png` |
| External rebuild | `npm run check:rebuild` | fresh copy of `web/` in `/tmp/pepe-rebuild`, `npm ci` from the lockfile, typecheck and build; all 9 export files byte-identical to the committed `dist/` | `rebuild-results.json` |
| Export and manifest | `npm run check:export` | manifest fields, relative URLs, local assets, cover size, no QA globals, bundle under 8 MiB | `export-check.json` |

Tools were installed under `/tmp/pepe-browser-tools` (from `web/package-lock.json`) and Chromium under `/tmp/pepe-browsers`; nothing was installed inside the repository and no ignore file was changed.

## Revision findings reproduced and fixed

Each reviewer report was reproduced against the previous export before any change (`test/scratch/repro.mjs`, not shipped), then fixed and re-measured.

| Report | Reproduced as | Fix (final source) | Verified by |
| --- | --- | --- | --- |
| Evidence links point to a missing `artifacts/` directory | `git ls-files artifacts` empty; `.git/info/exclude` line 4 ignores `artifacts/` | All scripts write to `evidence/` (`scripts/browser-test.mjs:8`, `scripts/browser-playthrough.mjs:6`, `scripts/browser-mechanics.mjs:6`, `scripts/check-rebuild.mjs:41`, `scripts/check-export.mjs`); README links updated | `git status` shows `evidence/` as addable; this directory |
| Tablet landscape touch controls below the viewport | 1024×768 touch: HUD y=105, stage 186–754, touch buttons 837–895, scrollHeight 1063 | `web/src/main.ts:347` measures `--fit-stage` (viewport minus everything above the stage and the touch strip); `web/src/style.css:1316` uses it for touch play outside short landscape; `web/src/style.css:1321` hides header, route and footer during touch play above 600px | Browser check "Tablet touch layouts": HUD top 1, stage 602px, all three buttons bottom 755 ≤ 768, no scroll; `game-tablet-landscape.png` |
| Closing help cancels a later host pause | help open → host `pause` → close help: mode became `playing` within 200ms | `web/src/main.ts:58`: a deliberate pause clears `resumeAfterDialog` | Browser check "Host pause outranks dialog" inside the sandboxed iframe |
| Portrait HUD hides the lethal Time countdown | `.time-stat` computed `display: none` at 320, 390 and 768 wide | Removed the hide rule; portrait HUD is a four-column grid with Time in the first row (`web/src/style.css:1230`) | Browser check "Short portrait HUD and result panels"; `game-mobile.png`, `game-over-short-phone.png` |
| Short portrait result panels focus a clipped button | 320×568 game over: `.center-content` 270px tall, retry at y=580–624 while focused | `web/src/main.ts:396` scrolls the focused primary action into view (`block: "nearest"`); `web/src/style.css:1331` removes result art and tightens spacing on portrait stages up to 700px high | Retry at y=393–437 inside stage 189–484 and focused; Resume on pause at 297–341; `game-over-short-phone.png` |

## Better Interface review of the final source

The pinned guide's six domains were applied while building and reviewed again after the revision. "Without a browser" checks read the source; "with a browser" checks come from `browser-results.json` and the screenshots.

### Accessibility

- Native `button`, `dialog`, `input` and `label` elements throughout `web/index.html` (labels at lines 241 and 275; seed field `autocomplete="off"` at 246). Skip link at line 27; polite live region at line 219.
- Visible 3px focus ring with 4px offset (`web/src/style.css:99`); forced-colors keeps a system Highlight outline (`web/src/style.css:1215`). Minimum 44px control height (`web/src/style.css:70`, close button at 588); touch buttons 56–58px.
- Browser: Tab order starts at the skip link; dialogs trap and restore focus; Axe WCAG 2.0/2.1 A/AA scans of the title and help states report 0 violations; reduced motion stops the cursor blink and the renderer's shake, twinkle and parallax; 200% root text size reflows at 1280px without horizontal overflow.
- Revision: focused primary actions are now visible on short stages (finding above). Not covered: a screen-reader session, native browser zoom, Safari and Firefox.

### Layout

- One page shell with a 1328px maximum, spacing tokens `--s1`…`--s8`, breakpoints at 1100, 800, 600 and 360px, short-landscape mode below 540px high.
- Browser: no horizontal overflow at 320, 390, 768, 1280 and 1440 wide; the title's New run action is inside the first 390×844 and 320×844 screens (`title-mobile.png`, `title-320.png`).
- Revision: touch play fits HUD, scene and touch strip into one viewport at 320×568, 320×844, 390×844, 600×900, 768×1024, 1024×768 and 844×390 (measured in `test/scratch/hud.mjs`, re-asserted for 320×568, 1024×768 and 768×1024 in the browser suite).

### Writing

- Headline of three words plus one plain line of premise on the title; directions sit next to the controls they describe (keyboard guide under the cabinet, labels on touch buttons, "hold for height" in the help sheet).
- Errors say what to do: "Use 1–20 letters, numbers or hyphens to name your run." Storage copy changes to match the real persistence scope.
- No tracked small capitals above headings.

### Typography

- Six sizes only (`--small` to `--display`), two locally bundled families, tabular numerals for HUD values, balanced headings and pretty paragraph wrapping (`web/src/style.css:117`).
- Revision: short portrait result headings step down to the subtitle size so the outcome and its action share the stage.

### Colors

- Tokens in `:root`; measured DOM contrast body 14.80:1, muted HUD 7.17:1, primary action 14.21:1, secondary button 13.20:1 (`browser-results.json`). Entities pair color with a distinct character so nothing depends on hue alone; low time turns red and also counts down.
- Not measured: canvas pixels under scanlines and translucent panels.

### UI

- One mint primary per screen, secondary and subtle actions, pressed-state toggles for mute and CRT, disabled Fire until earned, contextual Pipe button, confirmation before restart.
- Browser: pause and resume by key, HUD button, menu, host message and page visibility; game over and instant replay; mute and CRT remembered across reload; audio context created only after a gesture.

## Limitations

- Chromium automation is not a physical phone, tablet or screen-reader session. Device toolbars that change `innerHeight` are handled by re-measuring on resize, but were not tried on a real phone.
- Audible mix was not independently listened to; the synth's scheduling and gesture gate were checked.
- Novice completion time was not user-tested; the always-running bot finished in 4:47 game time.
- No cross-device save, trusted leaderboard or multiplayer; scores sent over the bridge are display hints.
