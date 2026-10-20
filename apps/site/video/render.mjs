import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [,, out, mode] = process.argv; // mode: "stills" or "all"
const FPS = 30;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://127.0.0.1:8099/compose.html");
const duration = await p.evaluate(() => window.ready);
mkdirSync(out, { recursive: true });
const times = mode === "stills" ? [1.5, 3.2, 7.5, 9.8, 12.8, 16.5, 20.5, 23.8, 32.5, 39.5, 41.5, 47.5, 53, 55.5, 58.5] : Array.from({ length: Math.round(duration * FPS) }, (_, i) => i / FPS);
let i = 0;
for (const t of times) {
  await p.evaluate((t) => window.frameAt(t), t);
  await p.screenshot({ path: `${out}/${String(i++).padStart(5, "0")}.${mode === "stills" ? "png" : "jpg"}`, ...(mode === "stills" ? {} : { type: "jpeg", quality: 92 }) });
}
console.log("frames", i, "errors", errs);
await b.close();
