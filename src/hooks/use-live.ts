import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveState = "connecting" | "live" | "reconnecting" | "offline";

/**
 * Subscribes to availability changes and calls `onChange` (debounced).
 * Also reconciles every `reconcileMs` and on reconnect / tab focus, so missed
 * events never leave the screen wrong.
 */
export function useLive(onChange: () => void, tables: string[] = ["availability_pulse"], reconcileMs = 30000) {
  const [state, setState] = useState<LiveState>("connecting");
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      clearTimeout(t);
      t = setTimeout(() => cb.current(), 250);
    };
    const name = `live-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`;
    let ch = supabase.channel(name);
    for (const table of tables) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, fire);
    }
    let wasDown = false;
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setState("live");
        if (wasDown) fire();
        wasDown = false;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        wasDown = true;
        setState(navigator.onLine ? "reconnecting" : "offline");
      }
    });
    const iv = setInterval(fire, reconcileMs);
    const onFocus = () => document.visibilityState === "visible" && fire();
    const onOffline = () => setState("offline");
    const onOnline = () => {
      setState("reconnecting");
      fire();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(","), reconcileMs]);

  return state;
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}
