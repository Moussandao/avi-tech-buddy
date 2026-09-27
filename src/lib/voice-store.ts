import { supabase } from "@/integrations/supabase/client";

/** Small IndexedDB store keeping voice recordings on the device until they can be uploaded. */
const DB = "avitech-voice";
const STORE = "blobs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVoiceLocally(blob: Blob): Promise<string> {
  const key = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await tx("readwrite", (s) => s.put(blob, key));
  return key;
}

export const getLocalVoice = (key: string) => tx<Blob | undefined>("readonly", (s) => s.get(key));
export const deleteLocalVoice = (key: string) => tx("readwrite", (s) => s.delete(key));

export function extensionFor(type: string): string {
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "webm";
}

/** Upload a recording to the private voice-notes storage. Returns the stored path, or null on failure. */
export async function uploadVoice(blob: Blob): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return null;
    const type = blob.type || "audio/webm";
    const path = `${userId}/${Date.now()}.${extensionFor(type)}`;
    const { error } = await supabase.storage
      .from("poultry-voice-notes")
      .upload(path, blob, { contentType: type.split(";")[0] });
    if (error) {
      console.error("Voice upload failed", error);
      return null;
    }
    return path;
  } catch (e) {
    console.error("Voice upload failed", e);
    return null;
  }
}
