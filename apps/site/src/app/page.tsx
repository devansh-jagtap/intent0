import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { AgentExchange } from "@/components/home/agent-exchange";
import { RequestBoard } from "@/components/home/request-board";
import { Reveal } from "@/components/home/reveal";
import { RulesBoard } from "@/components/home/rules-board";
import { GITHUB } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import "./home.css";

/*
 * intent0's home page is a switchboard: before menus, you told an operator what you needed and
 * she connected you, but only to lines wired into the board. Every tile here is one such line.
 * The photographs are real switchboards from public archives (credited in the footer); the
 * product itself is shown as its own interface. Few words, room around them, and motion that
 * shows what the product does.
 */

const STACKS = ["Next.js", "Express", "Laravel", "Django", "Flask", "Spring", "ASP.NET", "Go", "PHP", "Plain HTML"];

const WORDMARK: { ch: string; h: number; bg: string; fg: string }[] = [
  { ch: "i", h: 74, bg: "#ffffff", fg: "#173f35" },
  { ch: "n", h: 92, bg: "#173f35", fg: "#ffffff" },
  { ch: "t", h: 66, bg: "#f4f4f2", fg: "#173f35" },
  { ch: "e", h: 100, bg: "#070908", fg: "#ffffff" },
  { ch: "n", h: 80, bg: "#ffffff", fg: "#173f35" },
  { ch: "t", h: 70, bg: "#173f35", fg: "#ffffff" },
  { ch: "0", h: 96, bg: "#f7941d", fg: "#173f35" },
];

export default function Home() {
  return (
    <main className="home">
      <Reveal />

      {/* The first screen: the name, four links, the switchboard and one sentence. */}
      <section id="top" className="shell board hero" aria-label="intent0">
        <div className="tile name-band">
          <h1 aria-label="intent0">
            {"intent0".split("").map((ch, i) => (
              <span key={i} aria-hidden style={{ animationDelay: `${i * 55}ms` }}>
                {ch}
              </span>
            ))}
          </h1>
        </div>
        <nav className="hero-links" aria-label="Main">
          <a className="tile-link" href="#how">
            How it works
          </a>
          <a className="tile-link" href="#agents">
            AI agents
          </a>
          <Link className="tile-link" href="/docs/getting-started">
            Docs
          </Link>
          <Link className="tile-link" href="/dashboard">
            Dashboard
          </Link>
        </nav>
        <div className="rail-left">
          <figure className="tile photo m-0">
            <Image
              src="/pictures/victory-switchboard-1945.jpg"
              alt="Operators in headsets at a switchboard, plugging cords into its jacks"
              width={1280}
              height={1640}
              priority
              sizes="(max-width: 1100px) 50vw, 16vw"
            />
            <figcaption>Switchboard, 1945</figcaption>
          </figure>
          <div className="tile">
            <ul className="facts">
              <li>Works on your existing site</li>
              <li>Only tasks you approve</li>
              <li>Answers cite your pages</li>
              <li>Your model, your key</li>
            </ul>
          </div>
        </div>
        <figure className="tile photo hero-centre m-0">
          <Image
            className="drift"
            src="/pictures/bell-international-board.jpg"
            alt="A long row of telephone operators at the Bell System international board, its lines labelled London, Paris and Bermuda"
            width={1280}
            height={1017}
            priority
            sizes="(max-width: 1100px) 100vw, 66vw"
          />
          <div className="statement">
            <p>Visitors say what they need. Your site builds the page.</p>
          </div>
        </figure>
        <div className="rail-right">
          <div className="tile">One command to set up</div>
          <div className="tile stone">Runs on your server</div>
          <div className="tile navy">Open to AI agents</div>
          <Link className="tile lamp tile-link grid content-between" href="/docs/getting-started">
            <span className="s-lead font-bold">Set up intent0</span>
            <span aria-hidden className="text-2xl">
              ↗
            </span>
          </Link>
        </div>
      </section>

      {/* Eight clicks, one sentence. */}
      <section className="shell section" aria-labelledby="intro-title">
        <div className="board intro" data-reveal>
          <div className="tile night slogan">
            <h2 id="intro-title">
              Say it.
              <br />
              Get it.
            </h2>
          </div>
          <div className="tile trail" data-ui role="img" aria-label="Five menus on a city website become one sentence">
            <div className="trail-path">
              <span>Residents</span>
              <span>Utilities</span>
              <span>Water &amp; sewer</span>
              <span>New connection</span>
              <span>Apply</span>
            </div>
            <div className="trail-ask">I just moved in and need water</div>
            <p className="trail-count">
              8 → 1 <small>clicks, then one sentence</small>
            </p>
          </div>
          <figure className="tile photo m-0">
            <Image
              src="/pictures/operators-connect-calls-1950.jpg"
              alt="Three operators connecting calls with patch cords at a switchboard"
              width={1280}
              height={1009}
              sizes="(max-width: 760px) 100vw, 40vw"
            />
            <figcaption>Operators, 1950</figcaption>
          </figure>
        </div>
        <div data-reveal>
          <p className="intro-line">Operators connected you only to lines wired into the board. intent0 does the same for your website.</p>
        </div>
      </section>

      {/* How it works: one bar, each stage as long as it takes. */}
      <section id="how" className="shell section" aria-labelledby="how-title" data-reveal>
        <div className="section-head">
          <h2 id="how-title">Set up once. Then it runs.</h2>
          <Button render={<Link href="/docs/getting-started" />} nativeButton={false} className="bg-ink">
            Read the setup guide
          </Button>
        </div>
        <div>
          <div className="bar" data-ui>
            <div className="bg-stone" style={{ flexGrow: 2 }}>
              Two minutes
            </div>
            <div className="bg-ink text-white" style={{ flexGrow: 8 }}>
              Ten minutes
            </div>
            <div className="bg-night text-white" style={{ flexGrow: 90 }}>
              Every day after
            </div>
          </div>
          <div className="bar-notes">
            <p style={{ flexGrow: 2 }}>Run init</p>
            <p style={{ flexGrow: 8 }}>Approve tasks</p>
            <p style={{ flexGrow: 90 }}>People and agents ask</p>
          </div>
        </div>
      </section>

      {/* The request board: the one live thing. */}
      <section className="shell section" aria-labelledby="requests-title">
        <div className="requests" data-reveal>
          <div className="section-head">
            <h2 id="requests-title">Every request goes to a wired line</h2>
            <p>Try it on Riverton, the example city.</p>
          </div>
          <RequestBoard />
        </div>
      </section>

      <div className="shell">
        <div className="marquee-band" aria-hidden>
          <Marquee pauseOnHover className="items-center p-0 [--duration:40s] [--gap:0.5em]" repeat={3}>
            <span>Say what you need</span>
            <span className="lamp-dot" />
            <span className="text-lamp">we connect the line</span>
            <span className="lamp-dot" />
          </Marquee>
        </div>
      </div>

      {/* Close-ups of the interface, each doing its one thing. */}
      <section className="shell section" aria-labelledby="closeups-title">
        <div className="board closeups" data-reveal>
          <div className="tile heading w6h2">
            <h2 id="closeups-title">What visitors get</h2>
            <p className="s-lead">The right page, in your site&apos;s look.</p>
          </div>
          <figure className="tile photo w6h4 m-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/media/poster.jpg"
              aria-label="One minute of intent0 on Riverton City Services: a request becomes a form, a reference number and a cited answer"
            >
              <source src="/media/intent0.webm" type="video/webm" />
              <source src="/media/intent0.mp4" type="video/mp4" />
            </video>
            <figcaption>
              Recorded on Riverton. <a href="/media/intent0.mp4">Watch the minute</a>
            </figcaption>
          </figure>
          <div className="tile w3h2">
            <div className="macro" data-ui aria-hidden>
              <span className="keycap">Ctrl</span>
              <span className="keycap press">K</span>
            </div>
            <p className="caption">Ask from any page</p>
          </div>
          <div className="tile stone w3h2">
            <div className="macro" data-ui aria-hidden>
              <span className="toggle" />
            </div>
            <p className="caption">Only tasks you switch on</p>
          </div>
          <div className="tile navy w3h4">
            <div className="macro received" data-ui aria-hidden>
              <span className="stamp">Received</span>
              <span className="font-extrabold tracking-[-0.03em] whitespace-nowrap">WTR-2026-04101</span>
            </div>
            <p className="caption">A reference at the end</p>
          </div>
          <div className="tile w3h4">
            <div className="macro cite leading-tight" data-ui aria-hidden>
              A signed letter from the owner.<sup>1</sup>
            </div>
            <p className="caption">Every answer cited</p>
          </div>
          <div className="tile night w6h2">
            <div className="macro otp" data-ui aria-hidden>
              <span>4</span>
              <span>8</span>
              <span>2</span>
              <span>9</span>
              <span>1</span>
              <span>7</span>
            </div>
            <p className="caption">Codes can&apos;t be skipped</p>
          </div>
          <div className="tile stone w6h2">
            <div className="macro confirm" data-ui aria-hidden>
              <span className="box">
                <Check strokeWidth={3.2} />
              </span>
              I confirm these details are correct
            </div>
            <p className="caption">Final steps ask first</p>
          </div>
        </div>
      </section>

      {/* AI agents. */}
      <section id="agents" className="shell section" aria-labelledby="agents-title">
        <div className="agents" data-reveal>
          <div className="copy">
            <h2 id="agents-title">Agents use the same lines</h2>
            <p>Your approved tasks and a search of your pages, as tools for AI agents.</p>
            <ul className="chips">
              <li>Public tasks only</li>
              <li>Asks, never guesses</li>
              <li>Confirms anything final</li>
              <li>/llms.txt for crawlers</li>
            </ul>
          </div>
          <div className="exchange">
            <AgentExchange />
          </div>
        </div>
      </section>

      {/* The stacks it runs on. */}
      <section className="shell section" aria-labelledby="stack-title">
        <div className="board stack" data-reveal>
          <div className="tile navy">
            <h2 id="stack-title">Runs on your stack</h2>
          </div>
          {STACKS.map((s) => (
            <div key={s} className="tile">
              {s}
            </div>
          ))}
        </div>
      </section>

      {/* The rules, and the questions. */}
      <section className="shell section" aria-labelledby="rules-title" data-reveal>
        <div className="section-head">
          <h2 id="rules-title">Your rules decide</h2>
          <Button render={<Link href="/docs/rules" />} nativeButton={false} className="bg-ink">
            Read every rule
          </Button>
        </div>
        <RulesBoard />
      </section>

      {/* The action. */}
      <div className="shell">
        <section className="board cta" aria-labelledby="cta-title" data-reveal>
          <figure className="tile photo m-0">
            <Image
              src="/pictures/salt-lake-exchange-1907.jpg"
              alt="A long hall of operators at a new switchboard in Salt Lake City, 1907"
              width={1024}
              height={798}
              sizes="(max-width: 760px) 50vw, 13vw"
            />
          </figure>
          <div className="tile lamp action">
            <h2 id="cta-title">Add intent0 to your site</h2>
            <p>One command reads your code and shows you the tasks to approve.</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="cmd-tile">
                <code>npx intent0 init</code>
                <CopyButton text="npx intent0 init" className="rounded-full bg-night-2" />
              </span>
              <Button render={<Link href="/docs/getting-started" />} nativeButton={false} className="bg-ink">
                Getting started
              </Button>
            </div>
          </div>
          <div className="tile navy" />
        </section>
      </div>

      {/* The close: the name built from blocks. */}
      <footer className="foot">
        <div className="shell">
          <div className="blocks" aria-label="intent0" data-reveal>
            {WORDMARK.map((b, i) => (
              <span key={i} style={{ height: `${b.h}%`, background: b.bg, color: b.fg }} aria-hidden>
                {b.ch}
              </span>
            ))}
          </div>
          <div className="foot-links">
            <div className="col">
              <b>Product</b>
              <a href="#how">How it works</a>
              <a href="#agents">AI agents</a>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className="col">
              <b>Docs</b>
              <Link href="/docs/getting-started">Getting started</Link>
              <Link href="/docs/other-websites">Other websites</Link>
              <Link href="/docs/rules">Rules</Link>
            </div>
            <div className="col">
              <b>For machines</b>
              <a href="/llms.txt">llms.txt</a>
              <a href="/llms-full.txt">llms-full.txt</a>
              <a href={GITHUB}>GitHub</a>
            </div>
            <div className="credits">
              <b>Photographs, all public domain</b>
              <a href="https://commons.wikimedia.org/wiki/File:Photograph_of_Women_Working_at_a_Bell_System_Telephone_Switchboard_(3660047829).jpg">
                Bell System international switchboard, U.S. National Archives
              </a>
              <a href="https://commons.wikimedia.org/wiki/File:WAC_telephone_operators_operate_the_Victory_switchboard_during_the_Potsdam_Conference_in_their_headquarters_in..._-_NARA_-_199007.jpg">
                Victory switchboard, Potsdam 1945, U.S. Army Signal Corps (NARA)
              </a>
              <a href="https://commons.wikimedia.org/wiki/File:JBER_telephone_operators_connect_calls,_people_120124-A-ZY202-001.jpg">
                Fort Richardson operators, 1950, U.S. Army, David Bedard
              </a>
              <a href="https://commons.wikimedia.org/wiki/File:Telephone_switchboard_6_Oct_1907_Salt_Lake_City.jpg">
                Salt Lake City exchange, 1907, The Salt Lake Herald
              </a>
            </div>
          </div>
          <div className="foot-last">
            <p>© 2026 Devansh Jagtap. All rights reserved.</p>
            <Button render={<a href="#top" />} nativeButton={false} className="bg-ink">
              Back to the top
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}
