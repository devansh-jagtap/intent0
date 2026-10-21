import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { HeroDemo } from "@/components/hero-demo";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1 className="display">Your website, organised around what people came to do.</h1>
            <p className="lede">
              intent0 adds an Ask button to the site you already have. Visitors say what they want and get a page built for it, from tasks you approve and
              content you wrote.
            </p>
            <div className="actions">
              <CopyCommand command="npx intent0 init" />
              <Link className="link-btn" href="/docs/getting-started">
                Read the docs
              </Link>
            </div>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section className="block">
        <div className="wrap split">
          <div>
            <h2 className="h2">From a menu of everything to the one thing someone needs.</h2>
            <p className="muted" style={{ marginTop: 16, maxWidth: "40ch" }}>
              Big sites grow menus nobody can read. intent0 keeps your pages and adds a way in that starts from the visitor&apos;s words.
            </p>
          </div>
          <ol className="steps">
            <li>
              <span className="h3">Run one command</span>
              <code className="inline">npx intent0 init</code>
              <p>intent0 reads your routes and forms, and writes the tasks it found into one file: apply, register, book, track.</p>
            </li>
            <li>
              <span className="h3">Approve what it may do</span>
              <code className="inline">npx intent0 dashboard</code>
              <p>Switch tasks on or off, choose your model, and rebuild what it knows from your docs. Nothing goes live without your approval.</p>
            </li>
            <li>
              <span className="h3">Visitors ask</span>
              <p>
                Someone types <mark className="intent">track my application</mark> and gets a page for exactly that, wired to your own API, in your colours.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="block">
        <div className="wrap split">
          <h2 className="h2">One Ask button, three kinds of answer.</h2>
          <dl className="gets">
            <div>
              <dt>Tasks</dt>
              <dd>
                Guided step pages for what your site can do, submitted to your own endpoints. OTP checks stay required, and anything that can&apos;t be undone
                asks for confirmation first.
              </dd>
            </div>
            <div>
              <dt>Answers with sources</dt>
              <dd>
                <q>What did the notice on 6 October say?</q> gets a page answered from your content, every line linked to the page it came from, and code copied
                exactly from your docs.
              </dd>
            </div>
            <div>
              <dt>AI agents</dt>
              <dd>The same approved tasks and search, offered to Claude, Cursor and other agents over MCP, and to browser agents through WebMCP.</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="band">
        <section className="block">
          <div className="wrap">
            <h2 className="h2">The model writes pages. Your code decides what they can do.</h2>
            <div className="rules">
              <div>
                <h3>Only approved tasks</h3>
                <p>Every request goes to an endpoint in the manifest you approved. Destructive tasks start switched off.</p>
              </div>
              <div>
                <h3>Checked before shown</h3>
                <p>Generated pages may use only known components and real endpoints. If a check fails, the visitor lands on your own page.</p>
              </div>
              <div>
                <h3>No invented answers</h3>
                <p>Information pages must cite your content. Code examples come from your docs, never from the model.</p>
              </div>
              <div>
                <h3>Visitors&apos; data stays put</h3>
                <p>The model sees what someone asked, never what they typed into a form. Your key stays on your server.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="block">
        <div className="wrap split">
          <div>
            <h2 className="h2">Your model, your key, your server.</h2>
            <p className="muted" style={{ marginTop: 16, maxWidth: "44ch" }}>
              Bring any OpenAI-compatible model. Free tiers work, and so does a model running on your own machine. intent0 never sees your key.
            </p>
          </div>
          <div>
            <ul className="providers">
              <li>
                Groq<small>free tier</small>
              </li>
              <li>
                NVIDIA<small>free tier</small>
              </li>
              <li>
                Ollama<small>on your computer</small>
              </li>
              <li>OpenAI</li>
              <li>
                Any compatible endpoint<small>custom</small>
              </li>
            </ul>
            <p className="muted" style={{ marginTop: 24 }}>
              Works with Next.js, and with PHP, Express, Django, Flask, Spring, ASP.NET and Go sites through one script tag.{" "}
              <Link href="/docs/other-websites">See how</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="block final">
        <div className="wrap">
          <h2 className="h2">Add intent0 to your site in a few minutes.</h2>
          <div className="actions">
            <CopyCommand command="npx intent0 init" />
            <Link className="link-btn" href="/docs/getting-started">
              Getting started
            </Link>
          </div>
          <p className="muted" style={{ marginTop: 20 }}>
            Questions about intent0? Press <b>Ask this site</b> in the corner. This website runs on intent0 too.
          </p>
        </div>
      </section>
    </main>
  );
}
