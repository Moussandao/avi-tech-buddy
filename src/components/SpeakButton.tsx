import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/i18n";
import type { Language } from "@/lib/translations";
import { synthesizeSpeech } from "@/lib/tts.functions";
import { speak, stopSpeaking } from "@/lib/voice";

/* ---------- persistent + memory cache ---------- */
const memCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const DB = "avitech-tts";
const STORE = "clips";
const MAX_ENTRIES = 60;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as { src: string } | undefined)?.src ?? null);
    req.onerror = () => resolve(null);
  });
}
async function idbPut(key: string, src: string) {
  const db = await openDb();
  if (!db) return;
  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  store.put({ src, at: Date.now() }, key);
  const all = store.getAllKeys();
  all.onsuccess = () => {
    const keys = all.result;
    if (keys.length > MAX_ENTRIES) keys.slice(0, keys.length - MAX_ENTRIES).forEach((k) => store.delete(k));
  };
}

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Get one clip: memory → IndexedDB → server (deduplicated). */
function getClip(text: string, language: Language): Promise<string | null> {
  const key = `${language}:${hash(text)}:${text.length}`;
  const mem = memCache.get(key);
  if (mem) return Promise.resolve(mem);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const p = (async () => {
    const stored = await idbGet(key);
    if (stored) {
      memCache.set(key, stored);
      return stored;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    try {
      const res = await synthesizeSpeech({ data: { text, language } });
      if (!res.audio) return null;
      memCache.set(key, res.audio);
      void idbPut(key, res.audio);
      return res.audio;
    } catch (e) {
      console.error(e);
      return null;
    }
  })().finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

/** Split into short sentence groups so the first clip is quick to generate. */
function chunk(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?؟。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const limit = out.length === 0 ? 140 : 400;
    if (cur && cur.length + s.length > limit) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out.map((c) => c.slice(0, 1000)).slice(0, 12);
}

const FIRST_CLIP_TIMEOUT = 4000;

export function SpeakButton({ text, label, prefetch }: { text: string; label?: string; prefetch?: boolean }) {
  const { language, t } = useSettings();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const session = useRef(0);

  const stopAll = () => {
    session.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    stopSpeaking();
    setState("idle");
  };

  useEffect(() => () => stopAll(), []);

  useEffect(() => {
    if (!prefetch || !text.trim()) return;
    const parts = chunk(text);
    // Prepare the first clip immediately, the rest shortly after.
    void getClip(parts[0]!, language).then(() => parts.slice(1).forEach((p) => void getClip(p, language)));
  }, [prefetch, text, language]);

  const fallback = async (from: string) => {
    const ok = await speak(from, language, () => setState("idle"));
    if (ok) setState("playing");
    else {
      setState("idle");
      toast.error(t("noVoice"));
    }
  };

  const playSrc = (src: string, id: number) =>
    new Promise<boolean>((resolve) => {
      if (session.current !== id) return resolve(false);
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().then(() => setState("playing"), () => resolve(false));
    });

  const start = async () => {
    const id = ++session.current;
    const parts = chunk(text);
    if (parts.length === 0) return;
    setState("loading");
    // Kick off all clips in parallel; play them in order as they arrive.
    const clips = parts.map((p) => getClip(p, language));
    const first = await Promise.race([
      clips[0]!,
      new Promise<null>((r) => setTimeout(() => r(null), FIRST_CLIP_TIMEOUT)),
    ]);
    if (session.current !== id) return;
    if (!first) return fallback(text);
    for (let i = 0; i < parts.length; i += 1) {
      const src = i === 0 ? first : await clips[i]!;
      if (session.current !== id) return;
      const ok = src ? await playSrc(src, id) : false;
      if (session.current !== id) return;
      if (!ok) return fallback(parts.slice(i).join(" "));
    }
    if (session.current === id) setState("idle");
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-11 gap-2"
      aria-label={t("listen")}
      onClick={() => (state === "idle" ? void start() : stopAll())}
    >
      {state === "loading" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : state === "playing" ? (
        <VolumeX className="size-4" />
      ) : (
        <Volume2 className="size-4" />
      )}
      {state === "loading" ? t("audioLoading") : state === "playing" ? t("stopListening") : (label ?? t("listen"))}
    </Button>
  );
}
