# Implemented design: Pepe Bros. ASCII Odyssey

## Overview

A character-art platformer for desktop and touch browsers. The interface looks like a carefully kept pond terminal: dark green surfaces, mint primary actions, warm yellow rewards, monospace copy and pixel display lettering. The game is the main surface. The first screen presents its name, rescue goal and New run / Enter seed actions directly; there is no marketing page before play.

Reuse the cabinet, HUD, short action rows and native dialog sheets. The four-world route belongs to the game, rather than a general navigation system. All character/environment artwork is drawn as text by `Renderer` in `web/src/render.ts`. The more prominent frog on the title and cover uses the same character vocabulary.

## Colors

Canonical UI tokens are in `web/src/style.css` under `:root`; values use hex consistently.

| Token | Value | Role |
| --- | --- | --- |
| `--page` | `#101714` | Page, input wells, primary button text |
| `--surface` | `#17231d` | HUD, route, touch controls, sheets |
| `--stage` | `#101e1c` | Initial canvas background |
| `--hover` | `#25392e` | Secondary control hover |
| `--line` | `#3d5546` | Structural borders |
| `--text` | `#e4eadb` | Main copy and values |
| `--muted` | `#a0b19f` | Supporting copy and HUD labels |
| `--mint` | `#b6f3ad` | Primary action, title, player identity |
| `--gold` / `--focus` | `#ffdc8d` | Reward accents / 3px focus perimeter |
| `--danger` | `#ff9c9e` | Errors and low time |

The game art adds explicit roles: brown bricks `#d19a77`, blue water `#79bde8`, red enemies `#ff8e92`, mint Pepe `#a8f3bd`, Tea `#f4bf89`, Star `#d1b7ff`. Shape and character accompany color: `@`, `*`, `[?]`, `[#]`, `ö`, `§`, `~`, `||`.

World palettes are defined by `WORLDS` in `web/src/engine.ts`, consumed by the renderer:

| World | Background | Far / middle layers | Ground | Accent |
| --- | --- | --- | --- | --- |
| Swamp | `#101e1c` | `#24443b` / `#396653` | `#76bb83` | `#a8edb5` |
| Caves | `#1b1729` | `#332846` / `#66517f` | `#b5a0d6` | `#d1b7ff` |
| Sky Pads | `#172330` | `#2e4257` / `#61758b` | `#a5d2d1` | `#f0c9e8` |
| Bog Castle | `#26191e` | `#462833` / `#77424c` | `#d29085` | `#ffad9f` |

Measured DOM contrast pairs: body text/page **14.80:1**, muted HUD/surface **7.17:1**, primary text/mint fill **14.21:1**, secondary button text/surface **13.20:1**. Measurements come from browser-computed colors in `artifacts/browser-results.json`. These numbers do not certify every translucent effect or canvas pixel. There is one intentional dark theme; no alternate light palette.

## Typography

Locally bundled **Space Mono** regular 400 and bold 700 provide UI and game text; **Silkscreen** regular 400 provides title and result headings. WOFF2 sources are in `web/src/assets/fonts/`; production embeds them in CSS, avoiding external font requests in the opaque iframe. Fallback is `monospace`. Font synthesis is disabled, and the root applies font smoothing.

Six semantic size roles: `--small` .75rem, `--caption` .875rem, `--body` 1rem, `--subtitle` 1.25rem, `--heading` 2rem and `--display` 5.5rem. The title display steps down to 4.5rem at 800px and 4rem at 600px. Inputs remain 1rem. Canvas text uses world-space sizes for art, rather than adding interface type roles.

Body line-height is 1.5; descriptive copy uses 1.65–1.7. Headings use 1.1; the large two-line title uses .96–1.0 with -0.07em letter spacing. Headings balance; descriptive paragraphs use pretty wrapping. Dynamic numbers use tabular figures. Seeds are selectable and wrap when needed, not truncated. The title stage has a rem-based minimum height so 200% text enlargement retains the actions inside its surface.

## Layout

`page-shell` has a 1328px maximum width, centered with 32px inline padding. Padding becomes 20px at 800px and 12px at 600px. The spacing tokens `--s1` through `--s8` are 4, 8, 12, 16, 24, 32, 48 and 64px. Reuse 8–12px within control groups and 24–32px between groups.

Desktop composition: 104px header, compact HUD, 568px game stage, four-world route, keyboard guide and restrained footer. The title copy aligns 48px inside the cabinet while the frog diorama occupies the right side. `title-actions` is a horizontal primary/secondary pair; it can wrap.

At 1100px secondary header copy and some ornament drop away. At 800px the header becomes 80px, the stage 536px and HUD groups can wrap. At 600px the HUD becomes a three-column, two-row grid: Score/Lives/World above a seed spanning two columns and the settings controls. The title stage is 540px with a 33.75rem minimum. The route becomes two columns. The main action remains inside the first 390×844 viewport.

During mobile play the decorative route/footer disappear; the stage uses available viewport height (220–560px) and touch controls sit below it. A rotate hint recommends landscape without blocking portrait play. Touch capability is remembered on `body.touch-device` to survive browser pointer-media changes after rotation.

In landscape below 540px high, header/footer/help chrome disappear. The HUD occupies 58px. Touch controls have their own 70px strip, and the canvas takes the remaining height. A shallow canvas uses a 384-unit vertical view, cropped toward the terrain, instead of shrinking the entire 576-unit scene. The game camera and collision coordinates remain unchanged. Controls stay outside the action area and respect the visible viewport.

Browser inspection covered 320, 390, 768, 1280 and 1440px widths, 320×568 short portrait, 844×390 touch landscape, and 200% root text enlargement. Native browser zoom, RTL and translated strings were not tested; the shipped interface is English.

## Elevation & Depth

Depth in play comes from ASCII layers at .08, .12/.15 and .32 camera factors, not photographic artwork. The UI uses a `0 12px 40px #0003` cabinet shadow and `0 20px 70px #0009` dialog shadow. Borders define the cabinet, HUD and route. The primary button has a 3px terminal-key shadow in `#60885b`.

The stage creates its own stacking context. Character art is below optional scanlines (`z-index:5`); title/result panels use `z-index:6`. The touch strip uses `z-index:10`. Native dialogs use the browser top layer with `#080f0de3` backdrop. Scanlines never receive pointer input.

Reduced-motion preference disables decorative cursor blinking, parallax, twinkle and screen shake; gameplay movement remains essential. Ordinary buttons have 150ms background/border/transform transitions and a .96 pressed scale only when motion is permitted. No transitions use `all`.

## Shapes

The cabinet and sheets use 6px radii, reduced to 4px for the mobile cabinet. Controls, keycaps and fields use 3px. Rectilinear geometry and thin borders echo a terminal without making the action a grid of generic cards. Primary filled buttons are reserved for the next main action. Character sprites themselves are text silhouettes, including the four multi-line bosses.

## Components

| Pattern | Source | Behavior |
| --- | --- | --- |
| `.cabinet`, `.hud`, `.stat` | `web/index.html`, `web/src/style.css` | One game surface; stable numeric score/lives/world/seed display |
| `.primary`, normal button, `.small-button` | CSS; menu handlers in `main.ts` | Primary, secondary and HUD variants; hover, focus, active and disabled states |
| `.game-panel`, `.center-content` | `main.ts` `sync()` | Title, pause, level-clear, game-over and victory; focus moves to the primary action |
| `.sheet` / native `dialog` | HTML; `openDialog()` in `main.ts` | Seed entry, help, copy seed and restart confirmation; focus trap, Escape close, focus return |
| Seed field and `.field-error` | HTML; seed form handler | Persistent label, 1–20-character validation, inline announced recovery message |
| `.world-route`, `.route-stop.current` | HTML; `sync()` | Four-world journey with both label and current-step attribute |
| `.touch-controls` | HTML; pointer handlers in `main.ts` | Multi-pointer movement/jump; pointer capture and cancellation; Fire disabled until earned; contextual Pipe |
| `SafeStore` | `storage.ts` | Remembers settings/bests or falls back to session memory; copy changes to describe the actual persistence scope |
| `Renderer` | `render.ts` | Original character art, world palettes, score popups, boss warnings and wrapped canvas announcements |

All actions are native buttons, and fields have explicit labels. Custom focus is a 3px gold perimeter with a 4px offset (inside the canvas edge). Forced-colors mode retains system focus/borders. Short input presses are queued until a physics step, then the engine adds a 140ms jump buffer and a 110ms coyote window. Muting and CRT toggles expose pressed state. A stable polite live region announces significant game events without narrating every animation frame.

## Do's and Don'ts

- Start from the page shell, cabinet and existing spacing/type roles. Use the same local fonts and hex tokens.
- Give one primary action a mint fill. Use text plus a distinct glyph for game entities and statuses.
- Keep new game art in monospace characters and use each world's existing palette. Keep background detail dimmer than actionable characters.
- Preserve the classic-script / embedded-font export strategy and relative asset URLs. Avoid adding remote services or fonts.
- Extend dialogs with native controls and keep their focus behavior. Do not turn canvas art into unlabeled UI buttons.
- Preserve pause, touch cancellation and reduced-motion behavior when adding effects.
- For another informational screen, reuse a sheet, a short heading, body copy and one primary action; add its tests to the browser script and keep it out of the active play area.
