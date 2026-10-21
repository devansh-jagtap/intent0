import { Check, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { HeroDemo } from "@/components/hero-demo";
import { GithubIcon } from "@/components/logo";
import { SetupTabs } from "@/components/setup-tabs";
import { GITHUB } from "@/components/site-header";

const STEPS = [
  {
    title: "Read your code",
    text: "npx intent0 init scans your routes and forms and maps them into user tasks: the fields, the order, and the endpoint each step calls.",
  },
  {
    title: "Approve the tasks",
    text: "You review every task in the terminal or the dashboard. Only approved, switched-on tasks are ever offered. Delete and cancel stay off until you turn them on.",
  },
  {
    title: "Visitors say what they need",
    text: "They press Ask this site (or Ctrl/⌘ K) and type or speak, in their own words and language. intent0 picks the matching task or finds the answer in your pages.",
  },
  {
    title: "The right page, sent to your API",
    text: "Step pages are built live in your site's look, checked before they're shown, and submitted to your own endpoints. If anything fails, the visitor lands on your original page.",
  },
];

const RULES = [
  ["Only tasks you approved", "The model never invents a task, an endpoint or a field. Choices come from your manifest."],
  ["No steps skipped", "OTP, verification and document steps stay in place, in the order your backend expects."],
  ["Confirm before it's final", "Irreversible submits always ask the person first, in the browser and for agents."],
  ["A safe way back", "If anything fails, the visitor lands on your original page for that task."],
  ["Checked before shown", "Known components only, real endpoints only, cited content only, code only from your docs."],
  ["Their details stay theirs", "The model sees the request, never form data. Remembered details stay in that browser tab."],
];

const FAQ = [
  {
    q: "Do I have to rebuild my website?",
    a: "No. intent0 is a layer on top of the site you have. Your pages, backend, validation and logins stay exactly as they are; intent0 calls the same endpoints your forms already use.",
  },
  {
    q: "Which AI models does it work with?",
    a: "Any OpenAI-compatible API: Groq, NVIDIA, OpenAI, Ollama on your own machine, and others. You bring your own key; it stays in your server's environment and never reaches the browser. Without a key intent0 still works, with keyword matching and simple pages.",
  },
  {
    q: "What does the model see?",
    a: "The visitor's request sentence and your approved task list. Never the values people type into forms.",
  },
  {
    q: "Can it answer questions, not just run tasks?",
    a: "Yes. intent0 index builds Site Memory from your docs and pages. Answers may only use those sections, every statement is cited, and code is copied exactly. If something isn't on your site, it says so. Try it on this site: press Ask this site in the corner.",
  },
  {
    q: "What about sites that aren't Next.js?",
    a: "intent0 serve runs next to any backend (PHP, Express, Django, Flask, Spring, ASP.NET, Go, plain HTML) and your pages add one script tag. Backends need to answer with JSON.",
  },
];

function Heading({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="max-w-[44rem]">
      <h2 className="m-0 text-[clamp(32px,4.2vw,50px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance">{title}</h2>
      {intro && <p className="mt-4 mb-0 max-w-[60ch] text-[18px] text-pretty text-pencil">{intro}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="wrap grid items-center gap-12 pt-12 pb-20 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pt-20 lg:pb-28">
        <div>
          <h1 className="m-0 text-[clamp(42px,5.2vw,74px)] leading-[0.98] font-black tracking-[-0.045em] text-balance">
            Visitors say what they need. Your site builds the page.
          </h1>
          <p className="mt-6 mb-0 max-w-[34rem] text-[19px] leading-relaxed text-pretty text-pencil">
            intent0 sits on top of the website you already have. One sentence becomes the right form or an answer with its source, using only tasks you
            approved, sent to your own APIs. AI agents get the same safe path.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#video" className="btn">
              <Play className="size-4 fill-current" /> Watch the 1-minute video
            </a>
            <Link href="/docs/getting-started" className="btn quiet">
              Read the docs
            </Link>
          </div>
          <div className="cmd mt-7">
            <code>npx intent0 init</code>
            <CopyButton text="npx intent0 init" />
          </div>
        </div>
        <HeroDemo />
      </section>

      {/* Video */}
      <section id="video" className="border-t border-rule py-20 sm:py-28">
        <div className="wrap">
          <Heading title="See it on a real site" intro="A real recording on Riverton City Services, the fictional city website in the repository. One minute, no sound." />
          <div className="mt-10 overflow-hidden rounded-[18px] border border-rule bg-night p-1.5 shadow-[0_30px_70px_-34px_rgba(21,35,61,0.5)]">
            <video
              className="aspect-video w-full rounded-[13px] bg-black"
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
          <p className="mt-4 mb-0 text-[15px] text-pencil">Recorded in keyword mode, without an AI model. With a model, details in the sentence are filled in for you.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-rule py-20 sm:py-28">
        <div className="wrap grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Heading title="From your code to the right page" intro="Setup happens once, on your machine. After that, every request goes through the same checks." />
          </div>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <h3 className="m-0 text-[22px] leading-tight font-bold tracking-[-0.015em]">{s.title}</h3>
                <p className="mt-2 mb-0 max-w-[56ch] text-pencil">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What visitors get */}
      <section className="border-t border-rule py-20 sm:py-28">
        <div className="wrap">
          <Heading title="Tasks done. Questions answered." />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[18px] border border-rule bg-sheet p-6 sm:p-8">
              <h3 className="m-0 text-[22px] font-bold">Tasks</h3>
              <p className="mt-2 text-pencil">Apply, register, book, report, track. Guided step pages built for that request, submitted to your APIs, with a reference number at the end.</p>
              <div className="mt-6 flex items-end justify-between gap-4 border-t border-dashed border-rule pt-5">
                <div className="min-w-0 text-[15px]">
                  <p className="m-0 text-pencil">“I just moved into a new house and need water”</p>
                  <p className="mt-1 mb-0 font-semibold">Apply for a new water connection</p>
                </div>
                <div className="stamp shrink-0" aria-label="Received, reference WTR-2026-04101">
                  <div className="text-[15px] font-black tracking-[0.08em] uppercase">Received</div>
                  <div className="text-[11px] font-bold tabular-nums">WTR-2026-04101</div>
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-rule bg-sheet p-6 sm:p-8">
              <h3 className="m-0 text-[22px] font-bold">Answers</h3>
              <p className="mt-2 text-pencil">Questions answered only from your own docs and pages. Every statement cites its source, code is copied exactly, and a link takes them to the spot on the real page.</p>
              <div className="mt-6 border-t border-dashed border-rule pt-5 text-[15px]">
                <p className="m-0 text-pencil">“I rent my flat. What papers do I need?”</p>
                <p className="mt-1 mb-0">
                  <span className="bg-[linear-gradient(transparent_58%,rgba(86,49,214,0.2)_58%,rgba(86,49,214,0.2)_92%,transparent_92%)]">A signed letter from the owner and a copy of their photo ID.</span>
                  <sup className="ml-0.5 font-bold text-stamp">1</sup>
                </p>
                <p className="mt-1 mb-0 text-[13px] break-all text-pencil">1. /help/water-connection-documents#if-you-rent</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="border-t border-rule py-20 sm:py-28">
        <div className="wrap grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Heading
              title="Ready for AI agents, without scraping"
              intro="The same approved tasks and a site search become tools for AI agents: over MCP for Claude Desktop, Cursor and others, and WebMCP in the browser."
            />
            <dl className="mt-8 mb-0 grid gap-4">
              {[
                ["Public tasks only", "Tasks that need a signed-in person stay in the browser."],
                ["Asks, never guesses", "Missing details come back as a list of what to ask the person."],
                ["Confirmation for anything final", "Irreversible tasks need confirmed: true, after the person agrees."],
                ["Over HTTP or on your machine", "Your running site answers at /intent0/mcp; intent0 mcp runs locally."],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="font-bold">{t}</dt>
                  <dd className="m-0 text-pencil">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="overflow-hidden rounded-[18px] bg-night text-night-ink">
            <div className="flex items-center justify-between gap-3 border-b border-night-2 px-5 py-3 text-[13px] text-night-muted">
              <span>An agent reports a pothole on the example site</span>
              <span className="text-[#7fdcab]">real result</span>
            </div>
            <pre className="m-0 overflow-x-auto p-5 text-[13.5px] leading-relaxed">
              <span className="text-night-muted">{"// agent → your site: tools/call report_problem"}</span>
              {"\n"}
              {`{ "issueType": "pothole", "location": "14 Elm Street" }`}
              {"\n\n"}
              <span className="text-night-muted">{"// your site → agent"}</span>
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
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section id="dashboard" className="border-t border-rule py-20 sm:py-28">
        <div className="wrap">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Heading
              title="Stay in control, without editing JSON"
              intro="npx intent0 dashboard opens a page on your own computer: turn tasks on or off, fix wording and endpoints, approve a new revision, rebuild Site Memory, change the model and see exactly what agents get."
            />
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/dashboard" className="btn">
                Open the dashboard
              </Link>
              <Link href="/docs/dashboard" className="btn quiet">
                How it works
              </Link>
            </div>
          </div>
          <div className="mt-10 overflow-hidden rounded-[18px] border border-rule bg-sheet p-1.5">
            <Image src="/media/dashboard.png" alt="The intent0 dashboard showing the tasks of the example city website" width={2560} height={1600} className="h-auto w-full rounded-[13px]" />
          </div>
          <p className="mt-4 mb-0 max-w-[62ch] text-[15px] text-pencil">Your files and model key never leave your computer. This website&apos;s Dashboard page connects to it from your browser, with the link the command prints.</p>
        </div>
      </section>

      {/* Rules */}
      <section className="bg-night py-20 text-night-ink sm:py-28">
        <div className="wrap">
          <div className="max-w-[44rem]">
            <h2 className="m-0 text-[clamp(32px,4.2vw,50px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance text-white">The rules intent0 can&apos;t break</h2>
            <p className="mt-4 mb-0 text-[18px] text-night-muted">The model understands requests and arranges pages. Everything that matters is decided by rules in code.</p>
          </div>
          <ul className="mt-12 mb-0 grid list-none gap-x-12 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {RULES.map(([t, d]) => (
              <li key={t} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
                <span className="mt-0.5 grid size-6 place-items-center rounded-full border-2 border-[#a996ff] text-[#a996ff]">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <div>
                  <h3 className="m-0 text-[18px] font-bold text-white">{t}</h3>
                  <p className="mt-1 mb-0 text-[15.5px] text-night-muted">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Get started */}
      <section id="start" className="py-20 sm:py-28">
        <div className="wrap">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Heading title="Set up in minutes" intro="Pick where your site runs. Try it first on the example site: examples/city-services in the repository." />
            <Link href="/docs/getting-started" className="btn quiet shrink-0 self-start lg:self-auto">
              Full guide in the docs
            </Link>
          </div>
          <div className="mt-10">
            <SetupTabs />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-rule py-20 sm:py-28">
        <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Heading title="Good to know" />
          <div>
            {FAQ.map(({ q, a }) => (
              <details key={q} className="faq border-t border-rule py-5 last:border-b">
                <summary className="flex items-center justify-between gap-4 text-[19px] font-bold">
                  {q}
                  <span className="plus grid size-8 shrink-0 place-items-center rounded-full border border-rule text-[20px] leading-none font-normal text-pencil">+</span>
                </summary>
                <p className="mt-3 mb-0 max-w-[62ch] text-pencil">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-rule py-24 sm:py-32">
        <div className="wrap">
          <h2 className="m-0 max-w-[14ch] text-[clamp(40px,6vw,76px)] leading-[0.98] font-black tracking-[-0.045em]">Make your website intent-driven.</h2>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/docs/getting-started" className="btn">
              Get started
            </Link>
            <a href={GITHUB} className="btn quiet">
              <GithubIcon className="size-4" /> View on GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
