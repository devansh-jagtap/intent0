// Records real footage of intent0 on the example site via CDP screencast (JPEG frames + timestamps).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
const OUT = process.argv[2];
const ONLY = process.argv[3];
const W = 1600, H = 1000;

const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div'); c.id='__cur';
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M5 3l17 9.5-7.5 1.8L11 21z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style,{position:'fixed',left:(window.__cx??800)+'px',top:(window.__cy??500)+'px',zIndex:2147483647,pointerEvents:'none',transform:'translate(-5px,-3px)'});
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => { c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; sessionStorage.setItem('__c', e.clientX+','+e.clientY); }, true);
    addEventListener('mousedown', e => { const r=document.createElement('div'); Object.assign(r.style,{position:'fixed',left:e.clientX-18+'px',top:e.clientY-18+'px',width:'36px',height:'36px',borderRadius:'50%',background:'rgba(109,74,255,.35)',zIndex:2147483646,pointerEvents:'none',transition:'transform .45s ease, opacity .45s ease'}); document.documentElement.appendChild(r); requestAnimationFrame(()=>{r.style.transform='scale(2)';r.style.opacity='0'}); setTimeout(()=>r.remove(),500); }, true);
    const saved = sessionStorage.getItem('__c'); if (saved) { const [x,y]=saved.split(','); c.style.left=x+'px'; c.style.top=y+'px'; }
  });`;

const b = await chromium.launch();
async function clip(name, fn) {
  if (ONLY && ONLY !== name) return;
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  const move = (x, y, steps = 28) => page.mouse.move(x, y, { steps });
  const moveTo = async (loc, steps) => { const bb = await loc.boundingBox(); await move(bb.x + bb.width / 2, bb.y + bb.height / 2, steps); };
  const click = async (loc, steps) => { await moveTo(loc, steps); await page.waitForTimeout(180); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); };
  const dir = `${OUT}/${name}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  let recording = false;
  cdp.on("Page.screencastFrame", async (f) => {
    if (recording) { const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`; writeFileSync(file, Buffer.from(f.data, "base64")); frames.push({ file, t: f.metadata.timestamp }); }
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const start = async () => { await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 }); recording = true; };
  const wait = (ms) => page.waitForTimeout(ms);
  await fn({ page, move, moveTo, click, wait, start });
  // Hold the last frame a moment, then stop. A tiny scroll nudge forces a final frame.
  await wait(400);
  await page.evaluate(() => document.body.style.setProperty("outline", "0px solid transparent"));
  await wait(300);
  recording = false;
  await cdp.send("Page.stopScreencast");
  const t0 = frames[0]?.t ?? 0;
  writeFileSync(`${dir}/frames.json`, JSON.stringify(frames.map((f) => ({ file: f.file, t: f.t - t0 }))));
  console.log(name, frames.length, "frames", (frames.at(-1).t - t0).toFixed(1) + "s", errs.length ? errs : "");
  await ctx.close();
}

await clip("maze", async ({ page, move, click, wait, start }) => {
  await page.goto("http://localhost:5050/"); await wait(600); await move(700, 300, 2); await start(); await wait(500);
  await click(page.getByRole("button", { name: "Residents" })); await wait(700);
  await click(page.getByRole("link", { name: "Water & sewer" }).first()); await page.waitForLoadState(); await wait(900);
  await click(page.getByRole("link", { name: /Apply for a new water connection/ })); await page.waitForLoadState(); await wait(700);
  await page.mouse.wheel(0, 380); await wait(1100);
  await page.mouse.wheel(0, 300); await wait(900);
});

await clip("task", async ({ page, move, moveTo, click, wait, start }) => {
  await page.goto("http://localhost:5050/"); await wait(800); await move(1100, 560, 2); await start(); await wait(600);
  await click(page.getByRole("button", { name: "Ask this site" }), 30); await wait(700);
  await page.keyboard.type("The streetlight outside my house is broken", { delay: 48 }); await wait(450);
  await page.keyboard.press("Enter"); await wait(1500);
  const sel = page.locator("[data-intent0] select").first();
  await moveTo(sel); await wait(250); await sel.selectOption("streetlight"); await wait(600);
  const loc = page.locator("[data-intent0]").getByLabel(/Where is it/);
  await click(loc); await page.keyboard.type("Outside 14 Elm Street", { delay: 45 }); await wait(500);
  await click(page.locator("[data-intent0]").getByRole("button", { name: /Continue|Submit|Send/ }).last()); await wait(2600);
});

await clip("info", async ({ page, move, click, wait, start }) => {
  await page.goto("http://localhost:5050/"); await wait(800); await move(1100, 560, 2); await start(); await wait(500);
  await click(page.getByRole("button", { name: "Ask this site" }), 26); await wait(600);
  await page.keyboard.type("I rent my flat, what papers do I need?", { delay: 48 }); await wait(400);
  await page.keyboard.press("Enter"); await wait(2400);
  await page.mouse.wheel(0, 260); await wait(1600);
});
await b.close();
