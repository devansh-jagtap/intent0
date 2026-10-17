# Learning Progress

## Concept positioning (Intent-Driven Web vs Generative UI)
- Introduced (Claude explained): Google Generative UI (Nov 2025) generates HTML/CSS/JS per prompt for exploration; the learner's project constrains the LLM to intent classification and renders trusted schema-driven components for transactional tasks. Prior art: Dialogflow-style intent/slot filling, Vercel AI SDK / CopilotKit generative UI, A2UI and MCP Apps, MCP / OpenAI Apps SDK.
- Demonstrated understanding: none recorded yet.
- Needs reinforcement: not yet assessed.

## Tech stack discussion (2026-10-10)
- Learner liked the walkthrough; asked what's required: tech stack and requirements.
- Claude gave per-component requirements with technology options (proposals), mapped to the learner's stated preferred stack.
- Introduced (Claude explained): script embed vs installed SDK — an external script can't directly use the host's own React components; this conflicts with "use the company's own components" and needs a decision.
- Awaiting learner: delivery choice (embed script / SDK / both) with reasoning, v1 component list, LLM + speech-to-text preference.
- Learner decided (v1 scope): voice deferred; v1 = CLI (generates manifest + discovers company components) + script tag + SDK + runtime layer showing intent bar and other entry points on an existing company website; generated pages should use the company's components. No rationale given for shipping both delivery methods.
- Claude challenged: both delivery methods enlarge v1; script tag can't use the host's real React components. Proposed (not decided): shared framework-agnostic core with two thin wrappers. Follow-ups asked: what the script-tag version renders with; which site is the test host; dashboard/agent tools in v1; LLM provider.
- New requirement (learner, 2026-10-10): run the project completely free. Claude explained: tooling, local DB, npm/CDN, hosting free tiers are free; LLM is the only real cost — options local models (Ollama, hardware-dependent), free API tiers (rate limits, data-use terms), and lean on no-LLM entry points; production at scale won't be free. Asked learner's machine specs and LLM route; earlier follow-ups still open.
- Learner reported (2026-10-11): 8 GB RAM; GTX 1650 Ti (4 GB VRAM) + integrated GPU; has Vercel $5 credit, Groq free tier, NVIDIA free endpoints for testing.
- Claude explained: local models limited to ~1–4B quantized on 4 GB VRAM; 8 GB RAM is tight with Docker + dev servers + Ollama; introduced OpenAI-compatible APIs (switch providers by base URL + model). Proposed (not decided): one provider interface, hosted free tiers for generation, optional tiny local model, mock provider for tests, hosted free Postgres to save RAM. Awaiting learner's model-route choice + earlier open questions.

## v1 decisions (learner, 2026-10-16)
- Script tag (no access to company components): builds pages following the site's global CSS guidelines.
- Dashboard and agent tools: both in v1.
- Test host site: learner will build it.
- LLM: learner will provide free-tier keys (Groq, NVIDIA, Vercel credit); no explicit main/backup reasoning given.
- Claude flagged: never paste API keys in chat; store in a git-ignored env file.

## Pending decision
- Name: Step 1 implementation — monorepo skeleton + packages/schema + packages/core + hand-written example manifest + tests
- Stage: APPROVED 2026-10-17 — learner: "use this repo… you write, I will review and check the implementations". Implementing.
- Answers: stay in the OneDrive repo; Claude writes the example manifest, learner reviews; .vibe-wise/ gitignore not answered → left out of .gitignore.

## v1 architecture — treated as CONFIRMED 2026-10-17
- Learner rejected the confirmation picker and said "let's start making, we will correct things on the go" — recorded as confirmation of the architecture with BYOK + generated adapters and the listed proposed additions, open to later correction.
- Previous pending name: v1 architecture, stack and build order
- Stage: choice confirmation (Design checkpoint) — presented 2026-10-16 with proposed additions (monorepo layout, Zod schemas, script-tag primitives in Shadow DOM with captured CSS, OpenAI-compatible client with Groq primary / NVIDIA backup / mock, env-file keys, Neon Postgres, MCP server, build order starting with a hand-written manifest, Vercel Hobby).
- Previous name: First build (wedge) and 2-minute demo — now combined with tech stack choices
- Learner chose Discuss (2026-10-16) and decided: bring-your-own-key — customers choose their own model/provider/API key; the CLI asks for the key during setup; the dashboard lets them change model; intent0's own keys are used only for intent0's own development/demo.
- Claude explained: API keys must never be in browser code (script tag runs in the browser); model calls must run server-side — either on the customer's server (SDK server handler) or on an intent0-hosted service storing customer keys (secret custody). Same question for a hosted vs local dashboard. Also: CLI should write the key to a git-ignored env file, never the manifest; customer-chosen models may fail at structured JSON (validation + fallback protect).
- Now awaiting learner reasoning on: where model calls run for SDK vs script-tag customers; where the dashboard runs. Design confirmation to be re-offered afterwards.
- Learner decided (2026-10-16): static/no-server sites are not target customers (reasoning: no user actions → no intents to fulfil). Model calls run on the customer's own server; their key stays in their server environment. Dashboard is hosted by intent0: companies manage company details, review/correct manifest, change endpoints and settings later.
- Claude refined: the real requirement is "has a backend", not "frontend served by a server" (static frontend + separate API exists); many government backends aren't Node (Java/PHP/.NET), so intent0's server part may need to run as a separate small service; hosted dashboard means intent0 stores the manifest (internal API map) and needs a way to deliver approved changes to the customer server without holding keys.
- Awaiting: how intent0's server part runs on non-Node backends; how hosted-dashboard changes reach the customer server while keys stay on their side.
- Learner decided (2026-10-16): the CLI uses AI at setup time to generate intent0's server-side code in the customer's own backend language (Java, PHP, Node…), close to their backend. Customers choose provider + model via CLI at setup and can change model later from CLI or dashboard; key stays on their server. Dashboard edits update the hosted manifest; customer server picks changes up (mainly via CLI; dashboard changes via hosted manifest).
- Learner asked Claude to lay out the full system architecture and API calls with an example. Claude provided (proposals): thin generated adapter (model proxy only), validation in shared JS core, adapter fetches+caches approved manifest from intent0 Cloud with a server-only site secret, submits go directly from browser to the site's existing endpoints, three credentials (public site ID / server site secret / LLM key). Design checkpoint offered.
- Asked: what to build first given the confirmed design (e.g. a mock site to integrate with vs. a real open-source site), which pieces are in v1, what the demo shows.

## Overall system design — CONFIRMED 2026-10-10 (see project-map.md)
- Name: Overall system design (intent layer over existing sites)
- Stage: confirmed by learner (Confirm and continue); not implemented
- Presented: learner's design summary + Claude's proposed additions (deterministic failure rules, flow steps with inputs/outputs/dependencies, embed snippet as delivery for the top layer, agents limited to approved capabilities, pages as generated presentations of approved flows). Awaiting Confirm and continue or Discuss.
- Next after this: product wedge / first build + 2-minute demo.
- Learner chose Discuss; asked for an end-to-end real-world example. Claude gave a worked example (fictional CRM "PipeHub": developer integration via CLI + review + embed, end-user intent flow, fallback, agent use, company benefits). Example details (CLI commands, file formats, intent analytics) are Claude's illustrations, not learner decisions. Awaiting learner's reaction, then re-offer confirmation.
- Learner reaction (2026-10-10): understood the concept; liked the proposed additions and the safety net. Raised concern that an intent bar feels like a chatbot; considered rebuilding the whole UI instead; asked for an Indian government example.
- Claude explained: chatbot vs intent UI difference; offered entry-point options (intent bar, goal-based navigation, contextual task cards, voice/local language, full intent-organised site) and a staged path — proposals only. Gave Udyam (MSME) registration worked example incl. information intent ("opened a bakery") and cross-portal limit.
- Resolved sub-decision (learner, 2026-10-10): entry points = mix of intent bar, goal-based navigation, task cards and voice search. Layer first; full rebuild not now; not targeting departments yet.
- Learner decided scope: only tasks available on the integrated website; for cross-site needs, show a "you may also need" note (e.g. FSSAI, GST) at the end of a completed flow.
- Claude challenged: source of "you may also need" suggestions must be approved content, not LLM-invented legal advice; four entry points is a large MVP scope. Noted goal nav and task cards can be built from the manifest without an LLM; voice = speech-to-text into the same pipeline.
- Design checkpoint re-offered with updated summary (awaiting Confirm and continue / Discuss).
- Learner chose Discuss; proposed using web search as the source for "you may also need" suggestions.
- Claude challenged: fake/look-alike government sites and outdated or SEO-spam results; endorsement/liability when shown on an official site; latency and inconsistency at runtime. Mentioned options (proposals): domain allowlist (e.g. gov.in / nic.in), search at CLI/setup time with approval, runtime search clearly labelled with sources. Awaiting learner's choice and reasoning.
- Learner decided: no links to other websites; only tell the user, in plain words, that they might also need certain registrations/documents (e.g. FSSAI, GST for a bakery).
- Claude noted: removes fake-link risk; accuracy risk remains (wording must stay hedged; facts still need a source). Asked when the source search runs (setup with approval / live / both) — learner chose C (approved text by default; live search only for flows without an approved note); no rationale given. Claude proposed safeguards for the live path (official-domain sources only, hedged wording, log for later approval). Design confirmation re-offered.

## Design clarification (learner, 2026-10-09, round 6)
- Learner decided: OTP, document upload and verification steps are required and kept.
- Learner decided: not a single page; multi-step generated pages in the required order (e.g. Home → Services → Aadhaar, then generated step pages for the chosen task).
- Learner decided: flows are captured and saved by the CLI; generated page format saved as JSON (A2UI-like).
- Learner decided: company's landing page stays unchanged; product is a "top layer" added over the existing site giving users and agents an intent entry point; agents use the manifest's tools (WebMCP-like). Goal: replace huge menus with "menu of your intentions".
- Claude corrected: SPAs are not obsolete; "one screen" ≠ SPA.

## Design clarification (learner, 2026-10-09, round 5)
- Learner clarified: "mix of four" meant the combined idea, not adopting all four technologies literally. Role mapping proposal withdrawn.
- Learner decided: runtime generation per request; style taken from the existing site (global CSS, existing sections, pre-made components) as reference rules; manifest captures how data is shown to users and carried to the backend.
- Learner decided: fallback — if generation fails, route the user to the original existing page for that task (e.g. careers page).
- Learner stated value: collapse nested multi-page government flows (example: Aadhaar) into one page.
- Claude challenged: UI cannot remove backend-required steps (OTP, identity verification, ordered requests); new Aadhaar enrolment is in-person (biometrics), so some intents are informational rather than actions; failure needs a deterministic definition.
- Demonstrated: graceful degradation reasoning (existing site as fallback) — learner's own idea.

## Architecture direction (learner's decisions, 2026-10-09, round 4)
- Learner decided: combine WebMCP, A2UI, generative UI toolkits (AG-UI/CopilotKit, Thesys, Vercel AI SDK) and browser agents.
- Learner decided: pages generated live at runtime per user request (did not address no-prebuilt-flow case or approval impact; previous questions superseded by this choice).
- Learner's future idea (parked, not MVP): own browser that stores user interaction history and generates sites from past activity + company requirements.
- Claude proposed (not confirmed): role mapping — manifest exported as WebMCP tools; A2UI-style JSON as the generated page format; one toolkit as transport/streaming; browser agent only as fallback for sites without a manifest. Flagged: over-engineering risk; future browser has privacy implications and competitors (Perplexity Comet, OpenAI Atlas, Dia).

## Earlier wedge question (superseded)
- The older "product wedge" question is merged into the current "First build and 2-minute demo" pending decision. Binding and runtime model role were resolved by the confirmed design. Low-confidence intent handling is still undesigned (listed in project-map Unknowns scope).
- 2026-10-10: at learner's request Claude made an animated walkthrough artifact of the confirmed design (https://claude.ai/artifact/9dcSzjGQDEeUHCE3v6vsqw). Illustration only; counts, names and the portal are fictional. First-build question still awaiting learner reasoning.

## Runtime UI generation (learner's reasoning, 2026-10-09, round 3)
- Learner decided: the manifest (CLI-generated from codebase + company approval) is the trusted source for routing/endpoints.
- Learner proposed: runtime page generation by an agent using (1) pre-made components discovered from the company's codebase by the CLI and (2) a guidelines file describing what each kind of page should contain (e.g. contact page: company details, emails, footer).
- Learner asked: are multiple discussing agents needed? how long will generation take? how to make it faster/simpler for users.
- Claude answered: at runtime one model + deterministic validation (catalog-only components, manifest-only capabilities) rather than multi-agent debate; multi-model checks fit at CLI time. Gave rough latency estimates (labelled estimates). Proposed (not decided): pre-generate flows per capability at build time and select at runtime; stream / reveal step by step; small fast model. Flagged: discovered components need prop schemas and company approval to be reusable; static info pages (contact) gain little from generation.

## Verification & trust (learner's reasoning, 2026-10-09, round 2)
- Learner proposed: multiple agents from different LLM providers discuss the manifest file and each other to decide routing and whether a generated UI is suitable to show.
- Learner proposed: company reviews the manifest after running the CLI, plus a dashboard to view/edit routing and capabilities (human approval adopted).
- Learner proposed: per form/capability the manifest captures: is the user authorized, which fields and requirements, where the data goes (DB/file), business logic.
- Learner proposed: use generative UI toolkits (AG-UI/CopilotKit, Thesys, Vercel AI SDK) for frontend generation from described components.
- Learner stated: routing/connectivity must be 100% correct; UI is where generation happens.
- Claude challenged: build-time vs runtime consensus (multi-LLM debate per user request is slow/costly); diverse providers reduce but don't remove correlated error; route binding should not be LLM output at runtime at all; manifest shouldn't expose DB/file internals; crawl code, not production user data.
- Introduced (Claude explained): separating presentation (generated) from binding (deterministic, from approved manifest).

## Capability mapping (learner's reasoning, 2026-10-09)
- Learner proposed: a CLI with prewritten templates/rules runs on the company's codebase; AI reads frontend + backend code and produces a single mapping file (endpoints, which are secured, session handling, what to test); every generated UI is checked against this file.
- Learner proposed: act only on "100% guaranteed" model decisions, possibly using a model they called "Jeff/JEV" (unclear; asked whether they meant JEPA); multiple agents re-check the mapping regularly; on failure, user can regenerate the UI.
- Claude challenged: models give no 100% guarantee and confidence scores aren't calibrated guarantees; multiple agents share correlated errors; regenerate doesn't undo an already-submitted wrong action; codebase access, multi-repo/legacy systems and drift. Suggested (proposal): human-approved manifest, contract tests, runtime enforcement that the UI can only call approved capabilities.
- Demonstrated: learner independently arrived at a generated, persisted site-wide mapping file (equivalent to a capability manifest) as the source of truth for UI generation.
- Introduced: prior art with sources — WebMCP (Chrome 146 preview Feb 2026, W3C CG draft), A2UI v0.9 (Apr 2026), AG-UI, Thesys, Vercel AI SDK.

## Product vision (learner's reasoning, 2026-10-09)
- Learner proposed: existing websites become intent-driven; the user tells the UI their goal and a UI is generated at runtime for that goal; LLM changes only the frontend, existing APIs/endpoints stay unchanged and protected by the backend.
- Learner proposed: distribute as a CLI/SDK + rules so companies can convert their sites; companies choose a blueprint/style.
- Learner proposed: the same layer helps AI agents, who currently rely on crawling/scraping.
- Claude challenged: backend authorization doesn't protect against authorized-but-unintended actions wired by a generated UI; many sites lack clean APIs; runtime "deploy" is unnecessary (render in browser); per-request code generation is slow/unreliable for transactions; Web 1.0/2.0 definitions corrected.
- Introduced (Claude explained): how dynamic websites render today; capability manifest as shared source for UI and agents; prior art WebMCP, NLWeb, llms.txt, OpenAPI, MCP.

## Architecture
- Claude wrote a full proposed architecture before learning mode was activated. It is a proposal only; no design decisions have been confirmed by the learner. No code exists.
