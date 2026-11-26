"use client";

import { useState } from "react";
import { useBoard } from "@/components/board";
import { SpotterChat, SpotterConnection, SpotterHistory, useSpotter } from "@/components/spotter";

export default function Spotter() {
  const { me } = useBoard();
  const { turns, newChat, busy } = useSpotter();
  const [showKey, setShowKey] = useState(false);
  const name = me?.assistant ?? "Spotter";
  const connected = Boolean(me?.spotter);
  return (
    <div className="spotter-page">
      <div className="card chat">
        <div className="card-head">
          <div>
            <h1>{name}</h1>
            <p className="sub">Ask for anything Build can do. He writes and changes your week, just from a sentence.</p>
          </div>
          <div className="row" style={{ flex: "none" }}>
            {turns.length > 0 && <button type="button" className="btn sm" onClick={newChat} disabled={busy}>New chat</button>}
            {me && (
              <button type="button" className={`tag ${connected ? "good" : "warn"}`} aria-expanded={showKey} onClick={() => setShowKey(!showKey)} title="Show or change the API key">
                {connected ? `Claude (Anthropic) · ${me.model}` : "No model connected"}
              </button>
            )}
          </div>
        </div>
        {me && (!connected || showKey) && <SpotterConnection />}
        {(connected || !me) && <SpotterChat />}
      </div>
      <SpotterHistory />
    </div>
  );
}
