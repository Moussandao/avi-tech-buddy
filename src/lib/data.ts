import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dehydrate, hydrate } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { enqueue, flushOutbox, type OutboxTable } from "./outbox";

export interface Profile {
  id: string;
  farm_name: string;
  language: string;
  currency: string;
}

export interface Batch {
  id: string;
  name: string;
  breed: string | null;
  start_date: string;
  initial_count: number;
  current_count: number;
  is_active: boolean;
  notes: string | null;
}

export interface BatchEvent {
  id: string;
  batch_id: string;
  event_type: "mortality" | "vaccination" | "feed";
  quantity: number;
  note: string | null;
  occurred_at: string;
}

export interface Reading {
  id: string;
  temperature: number | null;
  humidity: number | null;
  batch_id: string | null;
  recorded_at: string;
}

export interface Transaction {
  id: string;
  batch_id: string | null;
  kind: "expense" | "sale";
  category: string;
  amount: number;
  currency: string;
  note: string | null;
  voice_note_url: string | null;
  occurred_at: string;
}

export interface Diagnosis {
  id: string;
  batch_id: string | null;
  image_path: string | null;
  disease: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string | null;
  recommendations: string[];
  language: string;
  is_demo?: boolean | null;
  created_at: string;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("not authenticated");
  return id;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, farm_name, language, currency")
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "farm_name" | "language" | "currency">>) => {
      const id = await currentUserId();
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useBatches() {
  return useQuery({
    queryKey: ["batches"],
    queryFn: async (): Promise<Batch[]> => {
      const { data, error } = await supabase
        .from("batches")
        .select("id, name, breed, start_date, initial_count, current_count, is_active, notes")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Batch[];
    },
  });
}

export function useBatchEvents() {
  return useQuery({
    queryKey: ["batch_events"],
    queryFn: async (): Promise<BatchEvent[]> => {
      const { data, error } = await supabase
        .from("batch_events")
        .select("id, batch_id, event_type, quantity, note, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BatchEvent[];
    },
  });
}

export function useReadings() {
  return useQuery({
    queryKey: ["readings"],
    queryFn: async (): Promise<Reading[]> => {
      const { data, error } = await supabase
        .from("readings")
        .select("id, temperature, humidity, batch_id, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Reading[];
    },
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, batch_id, kind, category, amount, currency, note, voice_note_url, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function useDiagnoses() {
  return useQuery({
    queryKey: ["diagnoses"],
    queryFn: async (): Promise<Diagnosis[]> => {
      const { data, error } = await supabase
        .from("diagnoses")
        .select("id, batch_id, image_path, disease, severity, summary, recommendations, language, is_demo, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Diagnosis[];
    },
  });
}

/**
 * Insert a row. When the device is offline (or the request fails) the row is
 * queued locally and pushed automatically once the network is back.
 */
export function useCreateRow(table: OutboxTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<{ queued: boolean }> => {
      const userId = await currentUserId().catch(() => null);
      const row = { ...payload, ...(userId ? { user_id: userId } : {}) };
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue(table, row);
        return { queued: true };
      }
      const { error } = await supabase.from(table).insert(row as never);
      if (error) {
        enqueue(table, row);
        return { queued: true };
      }
      return { queued: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      qc.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useDeleteRow(table: OutboxTable | "diagnoses") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

/** Flush queued rows whenever the browser comes back online. */
export function useOutboxSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const run = async () => {
      const sent = await flushOutbox();
      if (sent > 0) qc.invalidateQueries();
    };
    void run();
    window.addEventListener("online", run);
    const interval = window.setInterval(run, 60_000);
    return () => {
      window.removeEventListener("online", run);
      window.clearInterval(interval);
    };
  }, [qc]);
}

export function batchAlive(batch: Batch, events: BatchEvent[]): number {
  const dead = events
    .filter((e) => e.batch_id === batch.id && e.event_type === "mortality")
    .reduce((sum, e) => sum + Number(e.quantity || 0), 0);
  return Math.max(0, batch.initial_count - dead);
}

const CACHE_KEY = "avitech.cache";

/** Keep the last loaded data on the phone so it stays visible offline. */
export function useCachePersistence() {
  const qc = useQueryClient();
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) hydrate(qc, JSON.parse(raw));
    } catch {
      /* ignore corrupt cache */
    }
    let timer: number | undefined;
    const unsub = qc.getQueryCache().subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          const state = dehydrate(qc, { shouldDehydrateQuery: (q) => q.state.status === "success" });
          localStorage.setItem(CACHE_KEY, JSON.stringify(state));
        } catch {
          /* storage full */
        }
      }, 1000);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [qc]);
}
