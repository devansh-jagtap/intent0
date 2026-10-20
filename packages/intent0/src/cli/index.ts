import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openAiCompatible } from "@intent0/adapter";
import { Manifest, formatIssues, type ModelConfig } from "@intent0/schema";
import { ask, askSecret, confirm } from "./ask";
import { generateManifest } from "./generate";
import { detectProject, type Project } from "./project";
import { scanProject } from "./scan";
import { scanAnyProject } from "./scan-generic";
import { startDashboard } from "./dashboard";
import { startMcp } from "./mcp";
import { serve } from "./serve";
import { buildMemory, topTopics } from "./index-content";
import { MANIFEST_FILE, MEMORY_FILE, ensureEnvIgnored, manifestPath, patchLayout, readEnv, writeBar, writeEnv, writeManifest, writeMemory, writeRoute } from "./write";

const PROVIDERS: Record<string, { provider: ModelConfig["provider"]; baseUrl: string; model: string }> = {
  groq: { provider: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  nvidia: { provider: "nvidia", baseUrl: "https://integrate.api.nvidia.com/v1", model: "openai/gpt-oss-120b" },
  ollama: { provider: "ollama", baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
  openai: { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  custom: { provider: "openai_compatible", baseUrl: "", model: "" },
};
const SERVE_PORT = 4100;

const log = (s = "") => console.log(s);
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

type Flags = Record<string, string | true>;

function parseArgs(argv: string[]) {
  const [command = "help", ...rest] = argv;
  const flags: Flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (!a.startsWith("--")) continue;
    const [k, v] = a.slice(2).split("=");
    if (v !== undefined) flags[k!] = v;
    else if (rest[i + 1] && !rest[i + 1]!.startsWith("--")) flags[k!] = rest[++i]!;
    else flags[k!] = true;
  }
  return { command, flags };
}

function printFlows(manifest: Manifest) {
  for (const f of manifest.flows) {
    const tags = [f.auth === "signed_in" ? "sign-in" : "public", f.irreversible ? "irreversible" : null, f.enabled ? null : "DISABLED"]
      .filter(Boolean)
      .join(", ");
    log(`  ${f.enabled ? green("●") : yellow("○")} ${bold(f.title)} ${dim(`(${f.id}; ${tags}; fallback ${f.fallbackPath})`)}`);
    f.steps.forEach((s, i) => {
      const fields = s.fields.map((x) => x.name).join(", ") || "no fields";
      log(`      ${i + 1}. ${s.title}  ${dim(`${s.action ? `${s.action.method} ${s.action.path}` : "no action"} ← ${fields}`)}`);
    });
  }
}

async function chooseModel(project: Project, flags: Flags) {
  const env = readEnv(project);
  const providerName = String(flags.provider ?? (env.LLM_BASE_URL ? "" : (await ask("Model provider: groq, nvidia, ollama, openai or custom", "groq")))) || "custom";
  const preset = PROVIDERS[providerName] ?? PROVIDERS.custom!;
  const baseUrl = String(flags["base-url"] ?? env.LLM_BASE_URL ?? (preset.baseUrl || (await ask("OpenAI-compatible base URL"))));
  const model = String(flags.model ?? env.LLM_MODEL ?? (flags.provider && preset.model ? preset.model : await ask("Model", preset.model)));
  let key = process.env.INTENT0_API_KEY ?? env.LLM_API_KEY ?? "";
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl);
  if (!key && !local) key = await askSecret(`API key for ${baseUrl} (saved only to .env.local)`);
  if (!key && !local) throw new Error("An API key is needed to read your site and write the manifest.");
  const provider = (PROVIDERS[providerName]?.provider ?? (env.LLM_BASE_URL?.includes("groq") ? "groq" : "openai_compatible")) as ModelConfig["provider"];
  return { baseUrl, model, key, provider };
}

async function siteUrl(project: Project, flags: Flags): Promise<string> {
  const given = flags["site-url"];
  if (typeof given === "string") return new URL(given).origin;
  if (project.mode === "next") return "http://localhost:3000";
  const answer = await ask("Your website's address, as people open it in the browser", "http://localhost:3000");
  return new URL(answer).origin;
}

async function init(flags: Flags) {
  const project = detectProject(process.cwd(), { script: Boolean(flags.script) });
  log(bold("\nintent0 init") + dim(`  ${project.name}`));
  log(
    project.mode === "next"
      ? dim(`  Next.js App Router at ${project.appDir}: intent0 will be added as a route + component.`)
      : dim("  Not a Next.js App Router project: intent0 will run as `intent0 serve` and your pages get one <script> tag."),
  );
  if (project.mode === "next" && !project.hasIntent0Dependency) {
    log(yellow("\n  The intent0 package isn't in this project's dependencies yet. Install it first, e.g.:"));
    log("    npm install /path/to/intent0-0.0.1.tgz\n");
  }

  let keepManifest = false;
  if (existsSync(manifestPath(project)) && !flags.force) {
    const again = flags.yes ? false : await confirm(`${MANIFEST_FILE} already exists. Re-scan and replace it?`);
    if (!again) {
      log(dim("  Keeping the existing manifest (tasks). Run with --force to replace it."));
      keepManifest = true;
    }
  }

  if (!keepManifest) {
    log(bold("\n1. Reading your code"));
    const scan = project.mode === "next" ? scanProject(project) : scanAnyProject(project);
    log(`  Found ${scan.routes.length} backend route(s) and ${scan.forms.length} file(s) with forms.`);
    for (const r of scan.routes) log(dim(`    ${r.methods.join(",").padEnd(10)} ${r.path}${r.checksSession ? "  (checks session)" : ""}  ${r.file}`));

    log(bold("\n2. Website and model"));
    const url = await siteUrl(project, flags);
    const choice = await chooseModel(project, flags);
    log(dim(`  Website: ${url}`));
    log(dim(`  Model:   ${choice.model} via ${choice.baseUrl}`));
    const site = {
      id: project.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "site_$1") || "website",
      name: project.name,
      baseUrl: url,
    };
    const modelConfig = { provider: choice.provider, model: choice.model };

    if (scan.routes.length === 0) {
      // Docs/content site: nothing to submit, so intent0 works as an information assistant.
      log(dim("\n  No backend routes to call, so no tasks: intent0 will answer with information pages from your content."));
      writeManifest(project, { schemaVersion: 1, site, revision: 1, status: "approved", model: modelConfig, flows: [] });
    } else {
      log(bold("\n3. Mapping your site into user tasks") + dim("  (this can take a minute)"));
      const { manifest, dropped } = await generateManifest(
        scan,
        { model: openAiCompatible({ baseUrl: choice.baseUrl, apiKey: choice.key, model: choice.model }), site, modelConfig },
        log,
      );
      for (const d of dropped) log(yellow(`  Dropped flow ${d}`));

      log(bold(`\n4. Review: ${manifest.flows.length} task(s) found`));
      printFlows(manifest);
      log(dim("\n  Only approved tasks are shown to users. Disabled ones (○) stay hidden until you enable them in the manifest."));
      const approve = flags.yes ? true : await confirm("\n  Approve these tasks now?", false);
      manifest.status = approve ? "approved" : "draft";
      writeManifest(project, manifest);
      log(`  Wrote ${MANIFEST_FILE} ${approve ? green("(approved)") : yellow("(draft: nothing is shown until you run `intent0 approve`)")}`);
    }

    writeEnv(project, { LLM_BASE_URL: choice.baseUrl, LLM_MODEL: choice.model, LLM_API_KEY: choice.key });
    if (ensureEnvIgnored(project)) log(dim("  Added .env.local to .gitignore so the key isn't committed."));
    log(dim("  Saved model settings to .env.local"));
  }

  await indexContent(project, flags, true);
  finish(project);
}

function siteFromManifest(project: Project): string | undefined {
  try {
    return new URL(JSON.parse(readFileSync(manifestPath(project), "utf8")).site.baseUrl).origin;
  } catch {
    return undefined;
  }
}

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/** Builds Site Memory (intent0.memory.json) from the site's docs files and its live pages. */
async function indexContent(project: Project, flags: Flags, fromInit: boolean) {
  log(bold(`\n${fromInit ? "5" : "1"}. Site Memory: reading your content`) + dim("  (docs, guides, pages; no model needed)"));
  // Most sites keep their content in pages (or a CMS/database behind them), not in Markdown files,
  // so the running site is read too whenever it's reachable.
  let crawl = typeof flags.crawl === "string" ? flags.crawl : undefined;
  if (!crawl && !flags["no-crawl"]) {
    const site = siteFromManifest(project);
    if (site && (await reachable(site))) crawl = site;
    else if (site) {
      log(yellow(`  Your site isn't running at ${site}, so only files in the repo can be read.`));
      const answer = flags.yes ? "" : await ask("  Start it (e.g. npm run dev) and press Enter to read its pages, or type 'skip'", "");
      if (answer.toLowerCase() !== "skip" && (await reachable(answer.startsWith("http") ? answer : site))) crawl = answer.startsWith("http") ? answer : site;
      else log(dim(`  Later, with the site running: npx intent0 index`));
    }
  }
  const memory = await buildMemory({ root: project.root, crawl, maxPages: Number(flags["max-pages"] ?? 150), log });
  writeMemory(project, memory);
  const codeBlocks = memory.sections.reduce((n, s) => n + s.code.length, 0);
  log(`  Wrote ${MEMORY_FILE}: ${memory.pages.length} page(s), ${memory.sections.length} section(s), ${codeBlocks} code block(s), ${memory.links.length} link(s)`);
  if (memory.sections.length) log(dim(`  Main topics: ${topTopics(memory).join(", ")}`));
  else log(dim("  No content found. Run `npx intent0 index --crawl http://localhost:3000` while your site is running to read its pages."));
}

function finish(project: Project) {
  if (project.mode === "script") {
    log(bold("\n6. Add the intent bar to your website"));
    log("  a) Start the intent0 server in this folder (keep it running next to your website):");
    log(`       npx intent0 serve`);
    if (!project.hasIntent0Dependency) log(dim("       (intent0 isn't installed here, so run it from the package file: npx --package=<path to intent0-0.0.1.tgz> intent0 serve)"));
    log("  b) Add this line to your pages (or your shared layout/footer template), just before </body>:");
    log(green(`       <script src="http://localhost:${SERVE_PORT}/intent0.js" defer></script>`));
    log(dim("\n  Edit intent0.manifest.json to change tasks, then run `npx intent0 approve`. The server reloads it automatically."));
    agentsHint(`http://localhost:${SERVE_PORT}/intent0/mcp`);
    return;
  }

  log(bold("\n6. Adding the intent bar"));
  const route = writeRoute(project);
  log(route ? `  Created ${route}` : dim("  Server route already exists; left as is."));
  const bar = writeBar(project);
  log(bar ? `  Created ${bar}${Object.keys(project.kit).length ? dim(` (using your ${Object.keys(project.kit).join(", ")})`) : ""}` : dim("  Bar component already exists; left as is."));
  const layout = patchLayout(project);
  if (layout === "patched") log(`  Added <Intent0Bar /> to ${project.layoutFile}`);
  else if (layout === "already") log(dim("  Layout already includes <Intent0Bar />."));
  else log(yellow("  Couldn't edit your root layout automatically. Add <Intent0Bar /> inside <body> yourself."));

  log(bold("\nDone.") + " Start your dev server and open the Ask tab on the left edge of your site (or press Ctrl/⌘ K).");
  log(dim("  Edit intent0.manifest.json to change tasks, then run `npx intent0 approve` (or use `npx intent0 dashboard`)."));
  agentsHint("<your site>/intent0/mcp");
}

function agentsHint(httpUrl: string) {
  log(bold("\nAI agents") + dim("  (public approved tasks + search, over MCP)"));
  log(`  Over HTTP:  ${httpUrl}` + dim("  (set INTENT0_SITE_URL to your live address when you deploy)"));
  log(`  Local:      npx intent0 mcp --dir ${process.cwd()}\n`);
}

function approve() {
  const file = join(process.cwd(), MANIFEST_FILE);
  if (!existsSync(file)) throw new Error(`No ${MANIFEST_FILE} here. Run \`intent0 init\` first.`);
  const parsed = Manifest.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    log(yellow("The manifest has problems; fix them first:"));
    for (const e of formatIssues(parsed.error)) log(`  ${e}`);
    process.exitCode = 1;
    return;
  }
  const manifest = { ...parsed.data, status: "approved" as const, revision: parsed.data.revision + 1 };
  writeManifest(detectProject(process.cwd()), manifest);
  printFlows(manifest);
  log(green(`\nApproved revision ${manifest.revision}.`));
}

function startServer(flags: Flags) {
  const root = process.cwd();
  const manifestFile = join(root, typeof flags.manifest === "string" ? flags.manifest : MANIFEST_FILE);
  if (!existsSync(manifestFile)) throw new Error(`No ${MANIFEST_FILE} here. Run \`intent0 init\` first.`);
  serve({
    root,
    manifestFile,
    port: Number(flags.port ?? SERVE_PORT),
    origins: typeof flags.origin === "string" ? flags.origin.split(",").map((o) => new URL(o.trim()).origin) : [],
    log,
  });
}

function help() {
  log(`${bold("intent0")}: add an intent bar to an existing website

  intent0 init      Read your code, map it into user tasks with a model, and set up the bar.
                    Next.js App Router: adds a route + component.  Anything else: uses a <script> tag.
                    --provider groq|nvidia|ollama|openai|custom   --model <id>   --base-url <url>
                    --site-url <url>   --yes (approve without asking)   --force (replace manifest)
                    --script (use the script tag even on a Next.js project)
  intent0 index     (Re)build Site Memory (intent0.memory.json) from your docs files and running site
                    --crawl <url> (site address, default: the manifest's)   --no-crawl   --max-pages <n>
  intent0 approve   Validate ${MANIFEST_FILE} after you edit it and mark it approved
  intent0 serve     Run the intent0 server for script-tag websites (default port ${SERVE_PORT})
                    --port <n>   --origin <url,url>  (extra website addresses allowed to use it)
  intent0 dashboard Review and approve tasks, rebuild Site Memory, change the model and connect agents
                    in your browser (this computer only)   --port <n> (default 4200)
  intent0 mcp       Serve this site's public tasks + search to AI agents (Claude Desktop, Cursor…) over MCP (stdio)
                    --site <url>  (where the website runs; default: the manifest's site URL)   --dir <project folder>
                    A running site also answers MCP over HTTP at /intent0/mcp.

  The model key is read from INTENT0_API_KEY or asked for, and saved only to .env.local.`);
}

const { command, flags } = parseArgs(process.argv.slice(2));
const commands: Record<string, () => unknown> = {
  init: () => init(flags),
  index: () => indexContent(detectProject(process.cwd(), { script: Boolean(flags.script) }), flags, false),
  approve,
  serve: () => startServer(flags),
  mcp: () => {
    // Agent apps (e.g. Claude Desktop) don't start servers in your project folder, so it can be given.
    const root = typeof flags.dir === "string" ? flags.dir : process.cwd();
    const manifestFile = join(root, MANIFEST_FILE);
    if (!existsSync(manifestFile)) throw new Error(`No ${MANIFEST_FILE} here. Run \`intent0 init\` first.`);
    startMcp({ manifestFile, memoryFile: join(root, MEMORY_FILE), site: typeof flags.site === "string" ? flags.site : undefined, version: "0.0.1" });
  },
  dashboard: () => startDashboard({ project: detectProject(process.cwd()), port: Number(flags.port ?? 4200), version: "0.0.1", log }),
  help,
};

Promise.resolve()
  .then(() => (commands[command] ?? help)())
  .catch((err: Error) => {
    console.error(`\n\x1b[31mintent0: ${err.message}\x1b[0m`);
    process.exitCode = 1;
  });
