"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callApi, useSession } from "@/components/portal/form-kit";

/** Mock login: one button, no password. Returns to ?next= after signing in. */
export function LoginForm() {
  const user = useSession();
  const [busy, setBusy] = useState(false);

  function goNext() {
    const next = new URLSearchParams(window.location.search).get("next");
    // Only follow same-site paths.
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }

  async function signIn() {
    setBusy(true);
    const r = await callApi("POST", "/api/auth/login", {});
    setBusy(false);
    if (r.ok) goNext();
  }

  async function signOut() {
    await callApi("POST", "/api/auth/logout", {});
    window.location.reload();
  }

  if (user === undefined) return <p className="text-sm text-slate-500">Loading…</p>;

  if (user) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          You are logged in as <b>Demo User</b>.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
          <Button type="button" variant="outline" onClick={signOut}>
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p>This demo portal has a single test account. No password is needed.</p>
      <Button type="button" onClick={signIn} disabled={busy}>
        Login as Demo User
      </Button>
    </div>
  );
}
