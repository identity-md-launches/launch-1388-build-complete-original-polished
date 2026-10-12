import { writeFileSync, readFileSync } from "node:fs";
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const displayFont = readFileSync(
  "web/src/assets/fonts/silkscreen.woff2",
).toString("base64");
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><style>@font-face{font-family:Silkscreen;src:url(data:font/woff2;base64,${displayFont}) format('woff2')}</style><title>Pepe Bros. ASCII Odyssey</title><desc>An original mint ASCII frog in a starry pond kingdom. One frog. Eight levels. Bring the Golden Lily home.</desc><rect width="1200" height="630" fill="#101714"/><rect x="24" y="24" width="1152" height="582" rx="5" fill="#101e1c" stroke="#49634f"/><g font-family="monospace">`;
const text = (s, x, y, size, color) => {
  svg += `<text x="${x}" y="${y}" xml:space="preserve" ${size > 80 ? 'font-family="Silkscreen,monospace"' : ""} font-size="${size}" fill="${color}">${esc(s)}</text>`;
};
const art = (s, x, y, size, color, line = size * 1.1) =>
  s.forEach((v, i) => text(v, x, y + i * line, size, color));
for (let i = 0; i < 60; i++)
  text(
    i % 7 === 0 ? "+" : ".",
    50 + ((i * 137) % 1100),
    70 + ((i * 79) % 400),
    i % 7 === 0 ? 18 : 13,
    "#42634f",
  );
text("@ pepe2pepe / arcade", 60, 65, 18, "#a0b19f");
text("ASCII / 001", 993, 65, 16, "#a0b19f");
art(
  [
    "      /\\       ",
    "     /..\\      ",
    " /\\ /....\\ /\\ ",
    "/..V......V..\\",
  ],
  690,
  375,
  32,
  "#264538",
  32,
);
art(
  [
    "       .--.  .--.       ",
    "      / oo \\/ oo \\      ",
    "      |    ||    |      ",
    "   .--\\____/\\____/--.   ",
    "  /      ______      \\  ",
    " |     /        \\     | ",
    " |    |  _    _  |    | ",
    "  \\    \\______/    /  ",
    "   \\______________/   ",
    "    /    @@@@@@    \\   ",
    "   /   @@@@@@@@@@   \\  ",
    "  /____/        \\____\\ ",
  ],
  704,
  198,
  19,
  "#a8edb5",
  22,
);
text("PEPE", 70, 199, 108, "#b6f3ad");
text("BROS.", 70, 295, 108, "#b6f3ad");
text("ASCII ODYSSEY_", 75, 344, 29, "#ffdc8d");
text("One frog. Eight levels.", 78, 393, 20, "#e4eadb");
text("Bring the Golden Lily home.", 78, 427, 20, "#e4eadb");
text("[ > NEW ADVENTURE ]", 78, 488, 23, "#b6f3ad");
text("[?] [#] [?]", 970, 436, 20, "#ffdc8d");
text("*", 650, 332, 29, "#ffdc8d");
text("*", 1085, 227, 29, "#ffdc8d");
text("@", 715, 513, 36, "#b6f3ad");
text("ö", 989, 513, 36, "#ff8e92");
for (let i = 0; i < 36; i++) {
  text(
    i > 23 && i < 28 ? "~" : "=",
    43 + i * 32,
    545,
    30,
    i > 23 && i < 28 ? "#79bde8" : "#76bb83",
  );
  text(
    i > 23 && i < 28 ? "~" : ":",
    47 + i * 32,
    574,
    23,
    i > 23 && i < 28 ? "#397197" : "#396653",
  );
}
svg += "</g></svg>";
writeFileSync("web/public/cover.svg", svg);
