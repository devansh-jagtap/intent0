"use client";

import { useEffect, useState } from "react";

// A fictional portal with a crowded menu. One request turns into one page built for it.
const ASK = "renew my passport";
const MENU = ["Services", "Certificates", "Licences", "Taxes", "Land records", "Pensions", "Grievances", "Scholarships", "Notices", "Downloads", "RTI", "Contact"];
const LINKS = [
  "Birth certificate", "Income certificate", "Caste certificate", "Domicile", "Driving licence", "Vehicle transfer",
  "Passport services", "Property tax", "Water bill", "Trade licence", "Ration card", "Old-age pension",
  "Scholarship status", "Marriage registration", "Building permit", "Track application", "Forms", "Fee schedule",
];

type Stage = "idle" | "typing" | "generating" | "page";

export function HeroDemo() {
  const [stage, setStage] = useState<Stage>("idle");
  const [typed, setTyped] = useState("");
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(ASK);
      setStage("page");
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    setStage("idle");
    setTyped("");
    at(1100, () => setStage("typing"));
    for (let i = 1; i <= ASK.length; i++) at(1400 + i * 55, () => setTyped(ASK.slice(0, i)));
    const sent = 1400 + ASK.length * 55 + 500;
    at(sent, () => setStage("generating"));
    at(sent + 1900, () => setStage("page"));
    return () => timers.forEach(clearTimeout);
  }, [run]);

  return (
    <figure className="demo" aria-label="Example: a visitor asks a government portal to renew their passport, and intent0 builds the page for it">
      <div className="demo-chrome" aria-hidden>
        <span />
        <span />
        <span />
        <p>services.aranya.example</p>
      </div>
      <div className="demo-site" aria-hidden>
        <div className="demo-top">
          <b>Aranya Citizen Services</b>
          <small>Helpline 1800-000-0000</small>
        </div>
        <div className="demo-menu">
          {MENU.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="demo-links">
          {LINKS.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>

        {stage !== "page" && stage !== "generating" && (
          <div className={`demo-ask${stage === "typing" ? " open" : ""}`}>
            {stage === "typing" ? (
              <div className="demo-box">
                <small>Ask this site</small>
                <p>
                  <mark className="intent">{typed}</mark>
                  <i className="caret" />
                </p>
              </div>
            ) : (
              <span className="demo-btn">Ask this site</span>
            )}
          </div>
        )}

        {stage === "generating" && (
          <div className="demo-page">
            <p className="demo-asked">
              You asked: <q>{ASK}</q>
            </p>
            <p className="demo-gen">Generating your experience</p>
            <div className="demo-skel">
              <span style={{ width: "48%" }} />
              <span style={{ width: "90%" }} />
              <span style={{ width: "76%" }} />
              <span style={{ width: "100%", height: 40 }} />
            </div>
          </div>
        )}

        {stage === "page" && (
          <div className="demo-page built">
            <p className="demo-asked">
              You asked: <q>{ASK}</q>
            </p>
            <div className="demo-built">
              <ol className="demo-rail">
                <li data-on>Your details</li>
                <li>Verify with OTP</li>
                <li>Review and pay</li>
              </ol>
              <div className="demo-form">
                <p className="demo-title">Passport renewal</p>
                <label>
                  Full name<span>Asha Verma</span>
                </label>
                <label>
                  Current passport number<span>P-4821937</span>
                </label>
                <label>
                  Reason<span>Expiring soon</span>
                </label>
                <span className="demo-cta">Continue</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <figcaption>
        <span>{stage === "page" ? "One request, one page, built from the site's approved passport task." : "A fictional portal with dozens of links."}</span>
        <button type="button" onClick={() => setRun((r) => r + 1)}>
          Replay
        </button>
      </figcaption>
    </figure>
  );
}
