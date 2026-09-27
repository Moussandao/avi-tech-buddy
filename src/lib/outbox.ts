import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type OutboxTable = "batches" | "batch_events" | "readings" | "transactions";

export interface OutboxItem {
  localId: string;
  table: OutboxTable;
  payload: Record<string, unknown>;
  createdAt: string;
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

export function enqueue(table: OutboxTable, payload: Record<string, unknown>): OutboxItem {
  const item: OutboxItem = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    table,
    payload,
    createdAt: new Date().toISOString(),
  };
  write([...read(), item]);
  return item;
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
    for (const item of items) {
      const { error } = await supabase.from(item.table).insert(item.payload as never);
      if (error) {
        remaining.push(item);
      } else {
        sent += 1;
      }
    }
  } finally {
    flushing = false;
    write(remaining);
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
