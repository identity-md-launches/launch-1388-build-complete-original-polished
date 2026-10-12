import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
export const requireTools = createRequire(
  process.env.PEPE_TEST_TOOLS
    ? resolve(process.env.PEPE_TEST_TOOLS, "package.json")
    : new URL("../web/package.json", import.meta.url),
);
export const { chromium } = requireTools("playwright");
export async function preview() {
  const dist = resolve("dist");
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (path === "/test-host.html") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        `<!doctype html><html lang="en"><head><title>Opaque-origin arcade bridge test</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#101714"><iframe title="Pepe Bros. ASCII Odyssey" id="game" sandbox="allow-scripts allow-pointer-lock" src="/arcade/odyssey/" style="border:0;width:100vw;height:100vh"></iframe><script>window.messages=[];addEventListener('message',e=>{if(e.source===document.getElementById('game').contentWindow)messages.push(e.data)});document.getElementById('game').onload=()=>document.getElementById('game').contentWindow.postMessage({protocol:'pepe-game/1',type:'init',channel:'test-channel'},'*')</script></body></html>`,
      );
      return;
    }
    if (!path.startsWith("/arcade/odyssey/")) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const rel = path.slice("/arcade/odyssey/".length) || "index.html";
    const file = resolve(dist, rel);
    if (!file.startsWith(dist + "/")) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const bytes = await readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".json": "application/json",
          ".woff2": "font/woff2",
        }[extname(file)] || "application/octet-stream",
      );
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
