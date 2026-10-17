import type { JsonModel } from "@intent0/adapter";
import { Manifest, formatIssues, type ModelConfig } from "@intent0/schema";
import type { ScanResult } from "./scan";

const SHAPE = `{
  "flows": [
    {
      "id": "book_appointment",
      "title": "Book an appointment",
      "description": "Book a visit with a doctor.",
      "examples": ["I need to see a doctor", "book an appointment for tomorrow"],
      "enabled": true,
      "irreversible": false,
      "auth": "public",
      "fallbackPath": "/appointments/new",
      "steps": [
        {
          "id": "patient",
          "title": "Your details",
          "kind": "form",
          "fields": [
            { "name": "full_name", "label": "Full name", "type": "text", "required": true },
            { "name": "speciality", "label": "Speciality", "type": "select", "required": true,
              "options": [{ "value": "gp", "label": "General" }] }
          ],
          "action": { "method": "POST", "path": "/api/appointments", "sends": ["full_name", "speciality"], "returns": ["appointment_id"] }
        }
      ]
    }
  ]
}`;

function systemPrompt(): string {
  return [
    "You map an existing website's backend into user tasks (flows) for intent0, a layer that guides users through those tasks.",
    "You get a static scan: API routes (path, methods, inputs, outputs, an excerpt) and the forms that call them.",
    "Reply with only a JSON object shaped like this example:",
    SHAPE,
    "Rules:",
    "- One flow per real user task (e.g. register, update details, check status). Not one per endpoint.",
    "- Steps are the API calls the task makes, in order. Use only routes and methods from the scan. Never invent endpoints.",
    "- ids, field names and output names: lowercase snake_case. Field names must be the exact keys the endpoint expects.",
    "- A field belongs to the first step that sends it and must not repeat in later steps.",
    "- action.sends: fields of this or earlier steps, or outputs returned by earlier steps.",
    "- action.returns: response keys that later steps need, plus the final reference/confirmation id. A step's needs must be outputs of earlier steps.",
    "- field types: text, email, phone, number, date, textarea, select, radio, checkbox, file, otp. select/radio need options.",
    "- auth: \"signed_in\" if the route checks a session/cookie, else \"public\".",
    "- irreversible: true when the final step submits, cancels, deletes or pays.",
    "- enabled: false for destructive tasks (delete, cancel, close account). A human decides later.",
    "- fallbackPath: the page URL where the website's own form for this task lives.",
    "- examples: 2-4 short ways a real user would ask for this task.",
    "- Skip auth/login/session/admin endpoints; they are not user tasks.",
  ].join("\n");
}

function compactScan(scan: ScanResult, withExcerpts: boolean) {
  return JSON.stringify({
    routes: scan.routes.map(({ file: _file, excerpt, ...r }) => (withExcerpts ? { ...r, excerpt } : r)),
    forms: scan.forms,
  });
}

export interface GenerateOptions {
  model: JsonModel;
  site: { id: string; name: string; baseUrl: string };
  modelConfig: ModelConfig;
}

/**
 * Asks the model for flows, then checks them: valid against the schema, and every
 * action must be a route + method that really exists in the scan. Flows that point
 * at anything else are dropped.
 */
export async function generateManifest(scan: ScanResult, opts: GenerateOptions, log: (s: string) => void): Promise<{ manifest: Manifest; dropped: string[] }> {
  const known = new Set(scan.routes.flatMap((r) => r.methods.map((m) => `${m} ${r.path}`)));
  let feedback = "";
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    const withExcerpts = attempt === 0;
    let reply: unknown;
    try {
      reply = await opts.model.complete(systemPrompt(), `Scan:\n${compactScan(scan, withExcerpts)}${feedback}`);
    } catch (err) {
      const msg = (err as Error).message;
      // Free tiers have small request limits; try again with a smaller scan.
      if (withExcerpts && /413|too large|rate|tokens/i.test(msg)) {
        log("  Request too large for this model's limits; retrying with a smaller scan…");
        continue;
      }
      throw err;
    }

    const flows = (reply as { flows?: unknown })?.flows;
    const candidate = {
      schemaVersion: 1,
      site: opts.site,
      revision: 1,
      status: "draft",
      model: opts.modelConfig,
      flows: Array.isArray(flows) ? flows : [],
    };

    const dropped: string[] = [];
    candidate.flows = (candidate.flows as { id?: string; steps?: { action?: { method?: string; path?: string } }[] }[]).filter((f) => {
      const bad = (f.steps ?? []).find((s) => s.action && !known.has(`${s.action.method} ${s.action.path}`));
      if (bad) dropped.push(`${f.id ?? "?"} (uses ${bad.action?.method} ${bad.action?.path}, which doesn't exist)`);
      return !bad;
    });

    const parsed = Manifest.safeParse(candidate);
    if (parsed.success) return { manifest: parsed.data, dropped };
    lastErrors = formatIssues(parsed.error);
    feedback = `\nYour previous answer had these problems; fix them and reply with the full JSON again:\n${lastErrors.slice(0, 15).join("\n")}`;
    log(`  Model output needed fixes (${lastErrors.length} issues); asking again…`);
  }
  throw new Error(`Could not produce a valid manifest:\n${lastErrors.slice(0, 10).join("\n")}`);
}
