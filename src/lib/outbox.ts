import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { deleteLocalVoice, getLocalVoice, uploadVoice } from "@/lib/voice-store";

export type OutboxTable = "batches" | "batch_events" | "readings" | "transactions";

export interface OutboxItem {
  localId: string;
  table: OutboxTable | "diagnoses";
  /** insert (default) or delete by payload.id */
  op?: "insert" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
  attempts?: number;
  failed?: boolean;
  lastError?: string;
}

const MAX_ATTEMPTS = 3;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

/** True when an error comes from the network (retry forever) rather than the server refusing the data. */
function isNetworkError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return !error.code || msg.includes("fetch") || msg.includes("network") || msg.includes("timeout");
}

const KEY = "avitech.outbox";
const listeners = new Set<() => void>();

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export function getOutbox(): OutboxItem[] {
  return read();
}

export function enqueue(
  table: OutboxTable | "diagnoses",
  payload: Record<string, unknown>,
  op: "insert" | "delete" = "insert",
): OutboxItem {
  const withId = payload["id"] ? payload : { ...payload, id: newId() };
  const item: OutboxItem = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    table,
    op,
    payload: withId,
    createdAt: new Date().toISOString(),
  };
  write([...read(), item]);
  return item;
}

export { newId };

/** Put failed items back in the queue for another try. */
export function retryFailed() {
  write(read().map((i) => (i.failed ? { ...i, failed: false, attempts: 0 } : i)));
  void flushOutbox();
}

/** Drop items the server refused. */
export function discardFailed() {
  write(read().filter((i) => !i.failed));
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let flushing = false;

/** Try to push every queued record to the backend. Returns how many were sent. */
export async function flushOutbox(): Promise<number> {
  if (flushing || typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const items = read();
  if (items.length === 0) return 0;
  flushing = true;
  let sent = 0;
  const remaining: OutboxItem[] = [];
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    for (const item of items) {
      if (item.failed) {
        remaining.push(item);
        continue;
      }
      const { __voice_key: voiceKey, ...payload } = item.payload as Record<string, unknown> & {
        __voice_key?: string;
      };
      let error: { message?: string; code?: string } | null = null;
      if (item.op === "delete") {
        ({ error } = await supabase.from(item.table).delete().eq("id", String(payload["id"])));
      } else {
        if (userId && !payload["user_id"]) payload["user_id"] = userId;
        if (voiceKey) {
          const blob = await getLocalVoice(voiceKey).catch(() => undefined);
          if (blob) {
            const path = await uploadVoice(blob, String(payload["id"]));
            if (!path) {
              remaining.push(item);
              continue;
            }
            payload["voice_note_url"] = path;
          }
        }
        // upsert on id: a resend after a lost response never creates a duplicate row.
        ({ error } = await supabase
          .from(item.table)
          .upsert(payload as never, { onConflict: "id", ignoreDuplicates: true }));
      }
      if (error) {
        if (isNetworkError(error)) {
          remaining.push(item);
        } else {
          const attempts = (item.attempts ?? 0) + 1;
          remaining.push({ ...item, attempts, failed: attempts >= MAX_ATTEMPTS, lastError: error.message ?? "" });
        }
      } else {
        sent += 1;
        if (voiceKey) await deleteLocalVoice(voiceKey).catch(() => undefined);
      }
    }
  } finally {
    flushing = false;
    // Keep items queued while we were sending.
    const known = new Set(items.map((i) => i.localId));
    write([...remaining, ...read().filter((i) => !known.has(i.localId))]);
  }
  return sent;
}

export function useOutbox(table?: OutboxTable) {
  const [items, setItems] = useState<OutboxItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    return subscribeOutbox(sync);
  }, []);
  return table ? items.filter((i) => i.table === table) : items;
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
