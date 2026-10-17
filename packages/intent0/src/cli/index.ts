import { existsSync, readFileSync } from "node:fs";
import { openAiCompatible } from "@intent0/adapter";
import { Manifest, formatIssues, type ModelConfig } from "@intent0/schema";
import { ask, askSecret, confirm } from "./ask";
import { generateManifest } from "./generate";
import { detectProject, type Project } from "./project";
import { scanProject } from "./scan";
import { MANIFEST_FILE, ensureEnvIgnored, manifestPath, patchLayout, readEnv, writeBar, writeEnv, writeManifest, writeRoute } from "./write";

const PROVIDERS: Record<string, { provider: ModelConfig["provider"]; baseUrl: string; model: string }> = {
  groq: { provider: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  nvidia: { provider: "nvidia", baseUrl: "https://integrate.api.nvidia.com/v1", model: "openai/gpt-oss-120b" },
  ollama: { provider: "ollama", baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
  openai: { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  custom: { provider: "openai_compatible", baseUrl: "", model: "" },
};

const log = (s = "") => console.log(s);
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

function parseArgs(argv: string[]) {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string | true> = {};
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

async function chooseModel(project: Project, flags: Record<string, string | true>) {
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

async function init(flags: Record<string, string | true>) {
  const project = detectProject(process.cwd());
  log(bold("\nintent0 init") + dim(`  ${project.name}`));
  log(dim(`  App Router at ${project.appDir}`));
  if (!project.hasIntent0Dependency) {
    log(yellow("\n  The intent0 package isn't in this project's dependencies yet. Install it first, e.g.:"));
    log("    npm install /path/to/intent0-0.0.1.tgz\n");
  }

  if (existsSync(manifestPath(project)) && !flags.force) {
    const again = flags.yes ? false : await confirm(`${MANIFEST_FILE} already exists. Re-scan and replace it?`);
    if (!again) {
      log(dim("  Keeping the existing manifest. Run with --force to replace it."));
      return finishWiring(project, flags);
    }
  }

  log(bold("\n1. Reading your code"));
  const scan = scanProject(project);
  log(`  Found ${scan.routes.length} API routes and ${scan.forms.length} files with forms.`);
  for (const r of scan.routes) log(dim(`    ${r.methods.join(",").padEnd(10)} ${r.path}${r.checksSession ? "  (checks session)" : ""}`));
  if (scan.routes.length === 0) throw new Error("No API routes (app/**/route.ts) found. intent0 needs backend endpoints to call.");

  log(bold("\n2. Model"));
  const choice = await chooseModel(project, flags);
  log(dim(`  ${choice.model} via ${choice.baseUrl}`));

  log(bold("\n3. Mapping your site into user tasks") + dim("  (this can take a minute)"));
  const { manifest, dropped } = await generateManifest(
    scan,
    {
      model: openAiCompatible({ baseUrl: choice.baseUrl, apiKey: choice.key, model: choice.model }),
      site: { id: project.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "site_$1") || "website", name: project.name, baseUrl: String(flags["base-url-site"] ?? "http://localhost:3000") },
      modelConfig: { provider: choice.provider, model: choice.model },
    },
    log,
  );
  for (const d of dropped) log(yellow(`  Dropped flow ${d}`));
  if (manifest.flows.length === 0) throw new Error("The model found no user tasks it could map safely.");

  log(bold(`\n4. Review: ${manifest.flows.length} task(s) found`));
  printFlows(manifest);
  log(dim("\n  Only approved tasks are shown to users. Disabled ones (○) stay hidden until you enable them in the manifest."));
  const approve = flags.yes ? true : await confirm("\n  Approve these tasks now?", false);
  manifest.status = approve ? "approved" : "draft";
  writeManifest(project, manifest);
  log(`  Wrote ${MANIFEST_FILE} ${approve ? green("(approved)") : yellow("(draft: nothing is shown until you run `intent0 approve`)")}`);

  writeEnv(project, { LLM_BASE_URL: choice.baseUrl, LLM_MODEL: choice.model, LLM_API_KEY: choice.key });
  if (ensureEnvIgnored(project)) log(dim("  Added .env.local to .gitignore so the key isn't committed."));
  log(dim("  Saved model settings to .env.local"));

  finishWiring(project, flags);
}

function finishWiring(project: Project, _flags: Record<string, string | true>) {
  log(bold("\n5. Adding the intent bar"));
  const route = writeRoute(project);
  log(route ? `  Created ${route}` : dim("  Server route already exists; left as is."));
  const bar = writeBar(project);
  log(bar ? `  Created ${bar}${Object.keys(project.kit).length ? dim(` (using your ${Object.keys(project.kit).join(", ")})`) : ""}` : dim("  Bar component already exists; left as is."));
  const layout = patchLayout(project);
  if (layout === "patched") log(`  Added <Intent0Bar /> to ${project.layoutFile}`);
  else if (layout === "already") log(dim("  Layout already includes <Intent0Bar />."));
  else log(yellow("  Couldn't edit your root layout automatically. Add <Intent0Bar /> inside <body> yourself."));

  log(bold("\nDone.") + " Start your dev server and look for the intent bar at the top of your site.");
  log(dim("  Edit intent0.manifest.json to change tasks, then run `npx intent0 approve`.\n"));
}

function approve() {
  const project = detectProject(process.cwd());
  const file = manifestPath(project);
  if (!existsSync(file)) throw new Error(`No ${MANIFEST_FILE} here. Run \`intent0 init\` first.`);
  const parsed = Manifest.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    log(yellow("The manifest has problems; fix them first:"));
    for (const e of formatIssues(parsed.error)) log(`  ${e}`);
    process.exitCode = 1;
    return;
  }
  const manifest = { ...parsed.data, status: "approved" as const, revision: parsed.data.revision + 1 };
  writeManifest(project, manifest);
  printFlows(manifest);
  log(green(`\nApproved revision ${manifest.revision}. Restart the dev server if it doesn't pick up the change.`));
}

function help() {
  log(`${bold("intent0")}: add an intent bar to an existing Next.js site

  intent0 init      Read your code, map it into user tasks with a model, and add the bar
                    --provider groq|nvidia|ollama|openai|custom   --model <id>   --base-url <url>
                    --yes (approve without asking)   --force (replace an existing manifest)
  intent0 approve   Validate ${MANIFEST_FILE} after you edit it and mark it approved

  The model key is read from INTENT0_API_KEY or asked for, and saved only to .env.local.`);
}

const { command, flags } = parseArgs(process.argv.slice(2));
const commands: Record<string, () => unknown> = { init: () => init(flags), approve, help };

Promise.resolve()
  .then(() => (commands[command] ?? help)())
  .catch((err: Error) => {
    console.error(`\n\x1b[31mintent0: ${err.message}\x1b[0m`);
    process.exitCode = 1;
  });
