# Project Map

## Purpose
intent0 / Intent-Driven Web: a layer added to existing websites (government sites and companies) so users and AI agents state a goal and get guided, generated step pages for that task, instead of navigating deep menus.

## Requirements
- LLM must not invent capabilities, bypass permissions, execute code, fabricate API responses, or perform irreversible actions without user confirmation.
- UI built from structured definitions rendered with the site's own trusted components; no runtime-generated code.
- Required backend steps (OTP, document upload, verification) are kept.
- Preferred stack (stated preference): Next.js, React, TypeScript, Tailwind, shadcn/ui, Node.js, PostgreSQL, Prisma.
- Future (parked): personalised browser using interaction history; cross-department/government-wide layer; full intent-organised site rebuild.

## Components (design confirmed 2026-10-10; none implemented)
Learner decisions:
- CLI: reads the company codebase → manifest (actions, fields, auth, how data reaches backend), flows (ordered steps incl. OTP/docs/verification), style references (global CSS, sections, components). Company reviews/approves in CLI + dashboard.
- Layer over the existing, unchanged site.
- Entry points: intent bar, goal-based navigation, task cards, voice search.
- Runtime: goal → approved flow → step pages generated in the site's look, stored as JSON (A2UI-style); submit actions bound to the manifest.
- Fallback: on generation failure, redirect to the original page for that task.
- Scope: only tasks the site offers; end-of-flow "you may also need" note naming related registrations, no links; approved text by default, live web search only where no approved note exists.
- Agents use the same approved flows as tools.
Proposed additions accepted at confirmation (Claude's proposals):
- Company approves manifest + flows; generated pages validated by code before display.
- Flow step format: inputs, backend call, outputs, dependencies.
- Generation failure = invalid JSON / unknown component / unknown action / timeout → fallback.
- Delivery via embedded script or SDK.
- Agents: approved actions only; confirmation for irreversible actions.
- Cache generated JSON per flow/step.
- All entry points resolve to an approved flow ID → same generation + checks pipeline.
- Live-search safeguards: official-domain sources only, hedged wording, "use only official .gov.in sites" line, log live notes for later approval.

## v1 scope (learner decision, 2026-10-10)
- In: CLI (manifest + component discovery), runtime layer delivered as both script tag and SDK, entry points on an existing site (intent bar, goal navigation, task cards), generated pages using company components.
- Deferred: voice search.
- Decided 2026-10-16: dashboard and agent tools in v1; learner builds the test host site; script tag renders pages following the host's global CSS; free-tier LLM keys (Groq, NVIDIA, Vercel credit).
- Pending confirmation: monorepo layout, providers' roles, database hosting, build order.

## Main Flow
```
CLI (setup): codebase ──► manifest + flows + style ──► company approval
Runtime: [intent bar | goal nav | task cards | voice] ──► approved flow ID
        ──► generate step-page JSON (site components) ──► code validation
        ──► ok: render steps ──► submit via manifest ──► site backend ──► result + "you may also need"
        ──► fail: redirect to original page
Agents: approved flows exposed as tools ──► same manifest checks
```

## Data and Trust Boundaries
- Company backend keeps its own auth/validation; layer calls it with the user's session.
- Trust source for actions: company-approved manifest + flows.
- Model's runtime role: interpret intent, pre-fill fields, arrange approved components, phrase notes. Not routing.
- No links to external sites; crawl code, not production user data (raised by Claude; not formally decided).

## Build and Deployment
Repository contains a single initial commit; no build configuration yet.

## Unknowns
- First build / wedge and the 2-minute demo.
- Manifest and flow file formats in detail; component catalog format.
- How the CLI extracts flows from code (techniques, frameworks supported).
- Model provider(s); speech-to-text provider; hosting; storage for dashboard and logs.
