"use client";

import { useEffect, useRef, useState } from "react";
import { api, useBoard } from "@/components/board";
import { Routine, uniqueIds } from "@/lib/types";

type Theme = "system" | "light" | "dark";

/** Light, dark, or whatever the device is set to. Remembered in this browser. */
function Appearance() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try { const t = localStorage.getItem("wakeset-theme"); setTheme(t === "light" || t === "dark" ? t : "system"); } catch { /* stays on system */ }
  }, []);
  const choose = (next: Theme) => {
    setTheme(next);
    try { if (next === "system") localStorage.removeItem("wakeset-theme"); else localStorage.setItem("wakeset-theme", next); } catch { /* applies until the page is closed */ }
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  };
  return (
    <div className="card spread">
      <div><h3>Appearance</h3><p>System follows your device's light or dark setting.</p></div>
      <div className="seg" role="group" aria-label="Theme">
        {(["system", "light", "dark"] as Theme[]).map((t) => <button key={t} className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => choose(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
    </div>
  );
}

export default function Account() {
  const { me, state, update, flush, toast } = useBoard();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  if (!me || !state) return <p className="quiet">Loading…</p>;

  // After anything that changes who you are, load the page again from scratch.
  const act = async (run: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await flush();
      await run();
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ wakeset: 1, routine: state.routine }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${(state.routine?.name || "routine").replace(/[^\w-]+/g, "-").toLowerCase()}.wakeset.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (f: File) => {
    try {
      const parsed = Routine.parse(JSON.parse(await f.text()).routine);
      if (state.routine && !confirm(`Replace your current routine with "${parsed.name}"? Your ticks and logged weights will be cleared.`)) return;
      update((s) => { s.routine = uniqueIds(parsed); s.day = s.routine.days[0]?.id ?? ""; s.checks = {}; s.weights = {}; });
      toast("Routine imported");
    } catch {
      setError("That file is not a WakeSet routine.");
    }
  };

  return (
    <>
      <header className="top"><h1>{me.email ? "Account" : "Sign in"}</h1></header>

      {me.email ? (
        <div className="card spread">
          <div><h3>Signed in</h3><p>{me.email}. Your routine follows you to any device you sign in on.</p></div>
          <button className="btn" disabled={busy} onClick={() => act(() => api("POST", "logout"))}>Sign out</button>
        </div>
      ) : (
        <div className="card stack">
          <div>
            <h3>{mode === "signup" ? "Make an account" : "Sign in"}</h3>
            <p className="quiet">{mode === "signup"
              ? "Right now your routine is kept for this browser only. An account keeps it, and lets you open it on your phone and laptop."
              : "Signing in shows your account's routine here. Anything built on this device without an account is left behind."}</p>
          </div>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); act(() => api("POST", mode, { email, password })); }}>
            <label className="f">Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="f">Password{mode === "signup" && " (8 characters or more)"}<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <div className="spread">
              <button className="btn primary" disabled={busy}>{mode === "signup" ? "Create account" : "Sign in"}</button>
              <button type="button" className="link" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>{mode === "signup" ? "I already have an account" : "Make a new account"}</button>
            </div>
          </form>
        </div>
      )}
      {error && <p className="problem" role="alert" style={{ marginTop: 12 }}>{error}</p>}

      <Appearance />

      <div className="card spread">
        <div><h3>Routine file</h3><p>Save your routine as a file, or load one someone shared with you.</p></div>
        <div className="row">
          <button className="btn sm" disabled={!state.routine} onClick={exportFile}>Export</button>
          <button className="btn sm" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        </div>
      </div>

      <div className="card stack">
        <div><h3>Erase everything</h3><p>Deletes your routine, ticks and logged weights{me.email ? ", and your account" : ""}. This cannot be undone.</p></div>
        <div className="row">
          {me.email && <input type="password" placeholder="Your password" autoComplete="current-password" style={{ maxWidth: 220 }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} aria-label="Your password" />}
          <button className="btn sm danger" disabled={busy} onClick={() => { if (confirm("Erase everything? This cannot be undone.")) act(() => api("DELETE", "me", { password: confirmPassword })); }}>Erase</button>
        </div>
      </div>
    </>
  );
}
