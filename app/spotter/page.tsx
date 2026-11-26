"use client";

import Link from "next/link";
import { useBoard } from "@/components/board";
import { SpotterChat, useSpotter } from "@/components/spotter";

export default function Spotter() {
  const { me } = useBoard();
  const { turns, clear } = useSpotter();
  const name = me?.assistant ?? "Spotter";
  return (
    <>
      <header className="top">
        <h1>{name}</h1>
        {turns.length > 0 && <button className="btn sm" onClick={() => { if (confirm("Clear this conversation?")) clear(); }}>Clear chat</button>}
      </header>
      <p className="lede">Tell {name} what you want from your week and he writes or changes the routine for you. He is also on every page, from the button in the corner. You can still edit everything by hand in <Link href="/build">Build</Link>.</p>
      <SpotterChat />
    </>
  );
}
