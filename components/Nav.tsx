"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBoard } from "./board";

export function Nav() {
  const path = usePathname();
  const { me, problem } = useBoard();
  const tabs = [
    ["/", "Week"],
    ["/build", "Build"],
    ["/spotter", me?.assistant ?? "Spotter"],
    ["/account", me?.email ? "Account" : "Sign in"],
  ];
  return (
    <>
      <header className="site">
        <Link href="/" className="mark">Wake<span>Set</span></Link>
        <nav aria-label="Sections">
          {tabs.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
      </header>
      {problem && <p className="problem" role="alert">Not saved: {problem}</p>}
    </>
  );
}
