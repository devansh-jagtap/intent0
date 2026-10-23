/*
 * The host site's look, read from the live page: its colours, fonts, headings, a real button,
 * its cards and its content width. Generated pages are drawn with these, so a page made for one
 * visitor looks like the rest of that website instead of like intent0. Nothing leaves the browser.
 */

type Rgba = [number, number, number, number];

function rgb(color: string): Rgba | null {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(color);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
}
const opaque = (c: string) => (rgb(c)?.[3] ?? 0) > 0.5;
const luminance = ([r, g, b]: Rgba) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** A colour that looks like the site's brand: not transparent, near-white or near-black. */
function brandish(color: string): boolean {
  const c = rgb(color);
  if (!c || c[3] < 0.5) return false;
  const max = Math.max(c[0], c[1], c[2]);
  const min = Math.min(c[0], c[1], c[2]);
  return !(min > 225 || max < 40);
}

const outside = (el: Element) => !el.closest("[data-intent0], .i0-layer");
const visible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

export interface SiteLook {
  /** CSS custom properties for the layer (--i0-*). */
  vars: Record<string, string>;
  dark: boolean;
  /**
   * How tall the site's own top (banner, header, menu) is, with the page scrolled to the top.
   * Generated pages open below it, so they read as one of the site's pages. 0 when there is none.
   */
  chromeHeight: () => number;
}

/** The site's main button: the first filled, coloured button or link-button on the page. */
function siteButton(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>("button, [type=submit], .btn, .button, a[class*=btn], a[class*=button], a[data-slot=button]")) {
    if (outside(el) && visible(el) && brandish(getComputedStyle(el).backgroundColor)) return el;
  }
  return null;
}

/** The site's card style: a rounded box with its own background, the most common one on the page. */
function siteCard(pageBg: string): { radius: string; bg: string } | null {
  const seen = new Map<string, number>();
  const els = document.querySelectorAll<HTMLElement>("main *, section *, article, [class*=card], [class*=tile]");
  for (let i = 0; i < els.length && i < 600; i++) {
    const el = els[i]!;
    if (!outside(el) || el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "INPUT") continue;
    const s = getComputedStyle(el);
    const r = parseFloat(s.borderTopLeftRadius);
    if (!(r >= 4 && r <= 48) || !opaque(s.backgroundColor) || s.backgroundColor === pageBg) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 160 || box.height < 60) continue;
    const key = `${r}px|${s.backgroundColor}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const best = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;
  const [radius, bg] = best[0].split("|") as [string, string];
  return { radius, bg };
}

/** The width the site's own content is laid out in. */
function siteWidth(): number {
  for (const sel of ["main", "[role=main]", ".container", ".wrap", "article"]) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el || !outside(el)) continue;
    const max = parseFloat(getComputedStyle(el).maxWidth);
    if (max >= 640 && max <= 1600) return max;
    const w = el.getBoundingClientRect().width;
    if (w >= 640 && w < window.innerWidth - 40) return w;
  }
  return 1080;
}

/** Everything above the site's main content (top strip, header, menu), when it's a normal-sized top. */
function siteChromeHeight(): number {
  // On small screens a tall header would leave too little room: the page then covers everything.
  const most = window.innerHeight * 0.25;
  const main = [...document.querySelectorAll<HTMLElement>("main, [role=main]")].find((m) => outside(m) && visible(m));
  if (main) {
    const top = main.getBoundingClientRect().top + window.scrollY;
    if (top >= 40 && top <= Math.min(320, most)) return Math.round(top);
  }
  for (const el of document.querySelectorAll<HTMLElement>("body > header, header, [role=banner]")) {
    if (!outside(el) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    const bottom = r.bottom + (/fixed|sticky/.test(getComputedStyle(el).position) ? 0 : window.scrollY);
    if (r.height >= 40 && bottom <= Math.min(320, most) && r.width > window.innerWidth * 0.8) return Math.round(bottom);
  }
  return 0;
}

export function readSiteLook(): SiteLook {
  const body = getComputedStyle(document.body);
  const html = getComputedStyle(document.documentElement);
  const main = document.querySelector("main");
  const bg = [body.backgroundColor, html.backgroundColor, main ? getComputedStyle(main).backgroundColor : ""].find(opaque) ?? "rgb(255, 255, 255)";
  const ink = body.color || "rgb(28, 36, 51)";
  const dark = luminance(rgb(bg)!) < 100;
  const heading = [...document.querySelectorAll<HTMLElement>("h1, h2")].find((h) => outside(h) && visible(h));
  const head = heading ? getComputedStyle(heading) : null;
  const button = siteButton();
  const btn = button ? getComputedStyle(button) : null;
  const card = siteCard(bg);
  // A site can name its accent itself (--intent0-accent); otherwise its own button decides.
  const named = html.getPropertyValue("--intent0-accent").trim() || getComputedStyle(document.querySelector("[data-intent0]") ?? document.body).getPropertyValue("--intent0-accent").trim();
  let accent = named || btn?.backgroundColor;
  if (!accent) for (const a of document.querySelectorAll<HTMLElement>("a[href]")) if (outside(a) && brandish(getComputedStyle(a).color)) { accent = getComputedStyle(a).color; break; }
  accent ||= dark ? "#8ab4ff" : "#2f4fa8";

  const vars: Record<string, string> = {
    "--i0-bg": bg,
    "--i0-ink": ink,
    "--i0-font": body.fontFamily,
    "--i0-accent": accent,
    "--i0-on-accent": btn && !named ? btn.color : "#fff",
    "--i0-btn-radius": btn ? btn.borderTopLeftRadius : "10px",
    "--i0-btn-weight": btn ? btn.fontWeight : "600",
    // Buttons take the page's font: many sites never set one on <button>, leaving the browser's default.
    "--i0-btn-font": body.fontFamily,
    "--i0-head-font": head?.fontFamily ?? body.fontFamily,
    "--i0-head-weight": head?.fontWeight ?? "700",
    "--i0-head-spacing": head && head.letterSpacing !== "normal" ? head.letterSpacing : "-0.02em",
    "--i0-head-ink": head?.color ?? ink,
    "--i0-card-radius": card?.radius ?? "14px",
    "--i0-card": card?.bg ?? `color-mix(in srgb, ${ink} 5%, ${bg})`,
    "--i0-width": `${Math.round(siteWidth())}px`,
  };
  return { vars, dark, chromeHeight: siteChromeHeight };
}
