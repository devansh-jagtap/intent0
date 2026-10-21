import {
  ArrowRight,
  Bot,
  BookOpenText,
  CheckCircle2,
  FileCode2,
  LayoutDashboard,
  EyeOff,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  RotateCcw,
  ScanSearch,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Image from "next/image";
import { HeroDemo } from "@/components/hero-demo";
import { GithubIcon, Logo } from "@/components/logo";
import { Maze } from "@/components/maze";
import { Reveal } from "@/components/reveal";
import { SetupTabs } from "@/components/setup-tabs";

const GITHUB = "https://github.com/devansh-jagtap/intent0";

const NAV = [
  ["How it works", "#how"],
  ["Video", "#video"],
  ["Agents", "#agents"],
  ["Dashboard", "#dashboard"],
  ["Get started", "#start"],
] as const;

const STEPS = [
  {
    icon: ScanSearch,
    title: "Read your code",
    text: "npx intent0 init scans your routes and forms and maps them into user tasks: the fields, the order, the endpoint each step calls.",
  },
  {
    icon: ListChecks,
    title: "Approve the tasks",
    text: "You review every task in the terminal or the dashboard. Only approved, enabled tasks are ever offered. Delete and cancel stay off by default.",
  },
  {
    icon: MessageSquareText,
    title: "Visitors say what they want",
    text: "“Ask this site”, or Ctrl/⌘ K. In plain words, in their own language. intent0 picks the matching task or answers from your pages.",
  },
  {
    icon: Send,
    title: "The right page, sent to your API",
    text: "Step pages are built live in your site's look, checked before they're shown, and submitted to your own endpoints with the visitor's session.",
  },
];

const RULES = [
  { icon: ShieldCheck, title: "Only tasks you approved", text: "The model never invents a task, an endpoint or a field. Choices come from your manifest." },
  { icon: LockKeyhole, title: "No steps skipped", text: "OTP, verification and document steps stay in place, in the order your backend expects." },
  { icon: TriangleAlert, title: "Confirm before it's final", text: "Irreversible submits always ask the person first, in the browser and for agents." },
  { icon: RotateCcw, title: "Safe fallback", text: "If anything fails, the visitor lands on your original page for that task." },
  { icon: FileCode2, title: "Checked before shown", text: "Known components only, real endpoints only, cited content only, code only from your docs." },
  { icon: EyeOff, title: "Their words stay theirs", text: "The model sees the request, never form data. Remembered details stay in that browser tab." },
];

const FAQ = [
  {
    q: "Do I have to rebuild my website?",
    a: "No. intent0 is a layer on top of the site you have. Your pages, backend, validation and logins stay exactly as they are; intent0 calls the same endpoints your forms already use.",
  },
  {
    q: "Which AI models does it work with?",
    a: "Any OpenAI-compatible API: Groq, NVIDIA, OpenAI, Ollama on your own machine, and others. You bring your own key; it stays in your server's environment and never reaches the browser. Without a key intent0 still works with keyword matching and simple pages.",
  },
  {
    q: "What does the model see?",
    a: "The visitor's request sentence and your approved task list. Never the values people type into forms.",
  },
  {
    q: "Can it answer questions, not just run tasks?",
    a: "Yes. intent0 index builds Site Memory from your docs and pages. Answers may only use those sections, every statement is cited, and code is copied exactly. If something isn't on your site, it says so.",
  },
  {
    q: "What about sites that aren't Next.js?",
    a: "intent0 serve runs next to any backend (PHP, Express, Django, Flask, Spring, ASP.NET, Go, plain HTML) and your pages add one script tag. Backends need to answer with JSON.",
  },
];

function Section({ id, kicker, title, intro, children }: { id?: string; kicker: string; title: React.ReactNode; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mb-12 max-w-3xl">
        <p className="mb-3 font-mono text-xs tracking-[0.2em] text-cyan uppercase">{kicker}</p>
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h2>
        {intro && <p className="mt-5 text-lg text-pretty text-muted">{intro}</p>}
      </Reveal>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
          <a href="#top" aria-label="intent0 home">
            <Logo size={28} />
          </a>
          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="transition hover:text-ink">
                {label}
              </a>
            ))}
          </div>
          <a href={GITHUB} className="flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10">
            <GithubIcon className="size-4" /> GitHub
          </a>
        </nav>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-bg absolute inset-0" />
          <div className="glow float-a -top-60 -left-40 size-[700px] bg-violet/40" />
          <div className="glow float-b top-40 -right-60 size-[700px] bg-cyan/20" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
            <div>
              <Reveal>
                <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted">
                  <span className="size-1.5 rounded-full bg-ok" /> For government and company websites
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-7xl">
                  Your website, driven by <span className="text-gradient">intent.</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-xl text-lg text-pretty text-muted sm:text-xl">
                  Visitors say what they want. intent0 builds the right page from the tasks you approved and sends it to your own APIs. People and AI agents
                  get the same safe path.
                </p>
              </Reveal>
              <Reveal delay={240} className="mt-9 flex flex-wrap gap-3">
                <a href="#video" className="bg-mark flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-[0_12px_40px_-12px_rgba(124,92,255,0.8)] transition hover:brightness-110">
                  <PlayCircle className="size-5" /> Watch the 1-minute video
                </a>
                <a href="#start" className="flex items-center gap-2 rounded-full border border-line bg-white/5 px-6 py-3 font-semibold transition hover:bg-white/10">
                  Get started <ArrowRight className="size-4" />
                </a>
              </Reveal>
              <Reveal delay={320}>
                <p className="mt-8 font-mono text-sm text-faint">
                  <span className="text-cyan">$</span> npx intent0 init
                </p>
              </Reveal>
            </div>
            <Reveal delay={200}>
              <HeroDemo />
            </Reveal>
          </div>
        </section>

        {/* Problem */}
        <Section
          kicker="The problem"
          title={
            <>
              People know what they want. <span className="text-muted">Websites make them go find it.</span>
            </>
          }
          intro="Menus inside menus, forms spread across pages, help text three links away. Visitors give up, call support, or get it wrong. The bigger the site, the worse it gets."
        >
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <Reveal>
              <Maze />
            </Reveal>
            <Reveal delay={120} className="grid gap-4">
              {[
                ["Without rebuilding anything", "intent0 sits on top of your existing site. Your pages stay; your backend rules still decide."],
                ["Without a chatbot that makes things up", "Answers come only from your pages, with sources. Tasks come only from what you approved."],
                ["Without new forms to maintain", "Step pages are generated from your own fields and endpoints, in your site's look."],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-4 rounded-2xl border border-line bg-panel/60 p-5">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan" />
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="mt-1 text-muted">{d}</p>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </Section>

        {/* Video */}
        <Section id="video" kicker="See it" title="One minute. One sentence. The right page." intro="A real recording on Riverton City Services, the fictional example site in the repository.">
          <Reveal>
            <div className="edge overflow-hidden rounded-2xl p-1.5 shadow-[0_50px_120px_-40px_rgba(124,92,255,0.45)]">
              <video
                className="aspect-video w-full rounded-xl bg-black"
                controls
                playsInline
                preload="metadata"
                poster="/media/poster.jpg"
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
              >
                <source src="/media/intent0.webm" type="video/webm" />
                <source src="/media/intent0.mp4" type="video/mp4" />
                Your browser can&apos;t play this video.
              </video>
            </div>
          </Reveal>
          <p className="mt-4 text-center text-sm text-faint">Recorded in keyword mode, without an AI model. With a model, details in your sentence are filled in for you.</p>
        </Section>

        {/* How it works */}
        <Section id="how" kicker="How it works" title="From your code to the right page in four steps" intro="Setup happens once, on your machine. After that, every request goes through the same checks.">
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 110} className="edge relative flex flex-col rounded-2xl p-6">
                <span className="absolute top-5 right-5 font-mono text-sm text-faint">0{i + 1}</span>
                <span className="bg-mark mb-5 grid size-11 place-items-center rounded-xl">
                  <Icon className="size-5 text-white" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] text-muted">{text}</p>
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* Tasks + answers */}
        <Section kicker="What visitors get" title="Tasks done. Questions answered.">
          <div className="grid gap-5 lg:grid-cols-2">
            <Reveal className="edge rounded-2xl p-7">
              <Send className="mb-4 size-6 text-violet" />
              <h3 className="text-xl font-semibold">Tasks</h3>
              <p className="mt-2 text-muted">Apply, register, book, report, track. Guided step pages built for that request, submitted to your APIs, with a reference at the end.</p>
              <div className="mt-6 rounded-xl border border-line bg-bg/60 p-4 font-mono text-sm">
                <p className="text-faint">“I just moved into a new house and need water”</p>
                <p className="mt-2 text-ink">→ Apply for a new water connection</p>
                <p className="mt-1 text-ok">✓ WTR-2026-04101 · received</p>
              </div>
            </Reveal>
            <Reveal delay={120} className="edge rounded-2xl p-7">
              <BookOpenText className="mb-4 size-6 text-cyan" />
              <h3 className="text-xl font-semibold">Answers</h3>
              <p className="mt-2 text-muted">Questions answered only from your own docs and pages. Every statement cites its source; code is copied exactly; a link takes them to the spot on the real page.</p>
              <div className="mt-6 rounded-xl border border-line bg-bg/60 p-4 font-mono text-sm">
                <p className="text-faint">“I rent my flat. What papers do I need?”</p>
                <p className="mt-2 text-ink">→ A signed letter from the owner and a copy of their photo ID [1]</p>
                <p className="mt-1 text-cyan">[1] /help/water-connection-documents#tenants</p>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* Agents */}
        <Section
          id="agents"
          kicker="AI agents"
          title={
            <>
              Ready for agents, <span className="text-gradient">without scraping.</span>
            </>
          }
          intro="The same approved tasks and a site search become tools for AI agents: over MCP for Claude Desktop, Cursor and others, and WebMCP in the browser."
        >
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
            <Reveal className="grid gap-4">
              {[
                ["Public tasks only", "Tasks that need a signed-in person stay in the browser."],
                ["Asks, never guesses", "Missing details come back as a list of what to ask the person for."],
                ["Confirmation for anything final", "Irreversible tasks need confirmed: true, after the person agrees."],
                ["Over HTTP or on your machine", "Your running site answers at /intent0/mcp; intent0 mcp runs locally."],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-4">
                  <Bot className="mt-0.5 size-5 shrink-0 text-violet" />
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-muted">{d}</p>
                  </div>
                </div>
              ))}
            </Reveal>
            <Reveal delay={120} className="edge overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-line px-5 py-3 font-mono text-xs text-faint">
                <span>tools/call · report_problem</span>
                <span className="text-ok">real result</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-[#d4d4dc]">
                <span className="text-faint">{"// agent → your site"}</span>
                {"\n"}
                {`{ "issueType": "pothole", "location": "14 Elm Street" }`}
                {"\n\n"}
                <span className="text-faint">{"// your site → agent"}</span>
                {"\n"}
                {`{
  "status": "done",
  "task": "report_problem",
  "result": {
    "referenceId": "RPT-2026-04102",
    "status": "assigned to a crew"
  }
}`}
              </pre>
            </Reveal>
          </div>
        </Section>

        {/* Dashboard */}
        <Section
          id="dashboard"
          kicker="Dashboard"
          title="Stay in control, without editing JSON"
          intro="npx intent0 dashboard opens a page on your own computer: turn tasks on or off, fix wording and endpoints, approve a new revision, rebuild Site Memory, change the model and see exactly what agents get."
        >
          <Reveal>
            <div className="edge overflow-hidden rounded-2xl p-1.5">
              <Image src="/media/dashboard.png" alt="The intent0 dashboard showing the tasks of the example city website" width={2560} height={1600} className="w-full rounded-xl" />
            </div>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              [LayoutDashboard, "Save means approve", "Every save is checked against the rules and becomes a new revision."],
              [LockKeyhole, "Your key stays put", "Written to .env.local on your machine; never shown in the page."],
              [MessageSquareText, "Try a request", "See which task a sentence would start before visitors do."],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof LayoutDashboard;
              return (
                <Reveal key={t as string} delay={i * 100} className="rounded-2xl border border-line bg-panel/60 p-5">
                  <I className="mb-3 size-5 text-cyan" />
                  <p className="font-semibold">{t as string}</p>
                  <p className="mt-1 text-sm text-muted">{d as string}</p>
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* Rules */}
        <Section kicker="Trust" title="Built so nothing goes off-script" intro="The model understands requests and arranges pages. Everything that matters is decided by rules in code.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RULES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 100} className="rounded-2xl border border-line bg-panel/60 p-6 transition hover:border-violet/50">
                <Icon className="mb-4 size-6 text-violet" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{text}</p>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Works with */}
        <div className="overflow-hidden border-y border-line bg-panel/40 py-6" aria-label="Works with">
          <div className="marquee flex w-max gap-4">
            {[0, 1].map((k) =>
              ["Next.js", "PHP", "Laravel", "Express", "Django", "Flask", "FastAPI", "Spring", "ASP.NET", "Go", "Plain HTML", "Claude Desktop", "Cursor", "MCP", "WebMCP"].map((n) => (
                <span key={`${k}-${n}`} aria-hidden={k === 1} className="rounded-full border border-line px-5 py-2 text-sm whitespace-nowrap text-muted">
                  {n}
                </span>
              )),
            )}
          </div>
        </div>

        {/* Get started */}
        <Section id="start" kicker="Get started" title="Set up in minutes" intro="Pick where your site runs. Try it first on the example site: examples/city-services in the repository.">
          <Reveal>
            <SetupTabs />
          </Reveal>
        </Section>

        {/* FAQ */}
        <Section kicker="Questions" title="Good to know">
          <div className="grid gap-3">
            {FAQ.map(({ q, a }, i) => (
              <Reveal key={q} delay={i * 60}>
                <details className="group rounded-2xl border border-line bg-panel/60 p-5 open:bg-panel">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-muted">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <section className="relative overflow-hidden">
          <div className="glow float-a top-0 left-1/4 size-[600px] bg-violet/30" />
          <div className="relative mx-auto max-w-4xl px-4 py-28 text-center sm:px-6">
            <Reveal>
              <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                Make your website <span className="text-gradient">intent-driven.</span>
              </h2>
            </Reveal>
            <Reveal delay={120} className="mt-9 flex flex-wrap justify-center gap-3">
              <a href={GITHUB} className="bg-mark flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white transition hover:brightness-110">
                <GithubIcon className="size-5" /> View on GitHub
              </a>
              <a href="#start" className="flex items-center gap-2 rounded-full border border-line bg-white/5 px-6 py-3 font-semibold transition hover:bg-white/10">
                Get started <ArrowRight className="size-4" />
              </a>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 text-sm text-faint sm:flex-row sm:items-center sm:px-6">
          <Logo size={22} />
          <p>© 2026 Devansh Jagtap. All rights reserved.</p>
          <a href={GITHUB} className="transition hover:text-ink">
            github.com/devansh-jagtap/intent0
          </a>
        </div>
      </footer>
    </>
  );
}
