"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useBoard } from "./board";

const ICONS: Record<string, string> = {
  week: "M5 6h14v14H5zM5 10h14M9 4v4M15 4v4M9 15l2 2 4-4",
  build: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  spotter: "M4 5h16v11H9l-5 4z",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 20a8 8 0 0 1 16 0",
};

/** The WakeSet mark: a W with the marker stroke that crosses out a finished exercise. */
export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden>
      <path d="M12 20l9 24 11-17 11 17 9-24" fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="strike" d="M9 35l46-4" fill="none" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** The side bar on a wide screen; on a phone, a top bar with the sections in a drawer behind the menu button. */
export function Nav() {
  const path = usePathname();
  const { me, problem } = useBoard();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const assistant = me?.assistant ?? "Spotter";
  const nav = [
    { href: "/", id: "week", label: "Week" },
    { href: "/build", id: "build", label: "Build" },
    { href: "/spotter", id: "spotter", label: assistant },
    { href: "/account", id: "account", label: "Account" },
  ];
  const here = nav.find((n) => n.href === path)?.label ?? "";

  return (
    <>
      <header className="topbar">
        <button type="button" className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="sections" onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
        </button>
        <Link href="/" className="topbar-brand"><Mark />wakeset</Link>
        {here && <span className="topbar-page">{here}</span>}
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}
      <nav id="sections" className={`side ${open ? "open" : ""}`} aria-label="Sections">
        <div className="brand"><Mark />wakeset</div>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={`nav ${path === n.href ? "on" : ""}`} aria-current={path === n.href ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICONS[n.id]} /></svg>
            {n.label}
          </Link>
        ))}
        {problem && <div className="side-note" role="alert">Not saved: {problem}</div>}
        {me && (
          <div className="side-foot">
            <div className="side-user">
              {me.email
                ? <><b>Signed in</b><span>{me.email}</span></>
                : <><b>Not signed in</b><span>Saved in this browser. <Link href="/account">Make an account</Link> to keep it.</span></>}
            </div>
            <div><span className={`dot ${me.spotter ? "on" : ""}`} />{assistant} {me.spotter ? "on" : "off"}</div>
          </div>
        )}
      </nav>
    </>
  );
}
