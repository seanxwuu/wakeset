"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { State } from "@/lib/types";

// The browser's copy of the person's routine and week. Pages read it and
// change it through `update`; changes are saved a moment later, one save at a
// time, each carrying the revision it started from.
export type Me = { email: string | null; spotter: boolean; assistant: string; key: { source: "yours" | "site" | null; last4?: string }; model: string };
type Board = {
  state: State | null;
  me: Me | null;
  /** Shown when the last save did not go through; cleared by the next one that does. */
  problem: string;
  update: (change: (draft: State) => void) => void;
  /** Saves anything pending now and waits for it. */
  flush: () => Promise<void>;
  reload: () => Promise<void>;
  toast: (message: string) => void;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown>) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Could not reach WakeSet. Check your connection.", 0, {});
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(String(data.error ?? "Something went wrong."), response.status, data);
  return data as T;
}

const Ctx = createContext<Board | null>(null);
export const useBoard = () => useContext(Ctx)!;

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");
  const latest = useRef<State | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((message: string) => {
    setNote(message);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 2200);
  }, []);

  const adopt = (next: State) => {
    latest.current = next;
    setState(next);
  };

  const reload = useCallback(async () => {
    try {
      const [who, saved] = await Promise.all([api<Me>("GET", "me"), api<State>("GET", "state")]);
      setMe(who);
      if (!dirty.current) adopt(saved);
      setProblem("");
    } catch (error) {
      setProblem((error as Error).message);
    }
  }, []);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    queue.current = queue.current.then(async () => {
      if (!dirty.current || !latest.current) return;
      dirty.current = false;
      const sent = latest.current;
      try {
        const saved = await api<State>("PUT", "state", sent);
        // Keep anything typed while the save was in flight; take only the new revision.
        if (latest.current === sent) adopt(saved);
        else adopt({ ...latest.current, rev: saved.rev });
        setProblem("");
      } catch (error) {
        const e = error as ApiError;
        if (e.status === 409 && e.body.state) {
          adopt(e.body.state as State);
          toast("Updated from another device");
        } else {
          dirty.current = true;
          setProblem(e.message);
        }
      }
    });
    return queue.current;
  }, [toast]);

  const update = useCallback(
    (change: (draft: State) => void) => {
      if (!latest.current) return;
      const draft = structuredClone(latest.current);
      change(draft);
      adopt(draft);
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  useEffect(() => {
    reload();
    // Coming back to the tab picks up changes made on another device; leaving it saves.
    const onVisible = () => (document.visibilityState === "visible" ? reload() : flush());
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload, flush]);

  return (
    <Ctx.Provider value={{ state, me, problem, update, flush, reload, toast }}>
      {children}
      <div className={"toast" + (note ? " show" : "")} role="status" aria-live="polite">{note}</div>
    </Ctx.Provider>
  );
}
