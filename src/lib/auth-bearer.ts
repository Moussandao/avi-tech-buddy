import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

let refreshInFlight: ReturnType<typeof supabase.auth.refreshSession> | undefined;

function tokenExpiresAt(token: string): number {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function refreshAccessToken(): Promise<string | undefined> {
  refreshInFlight ??= supabase.auth.refreshSession();
  try {
    const { data, error } = await refreshInFlight;
    if (error) return undefined;
    return data.session?.access_token;
  } finally {
    refreshInFlight = undefined;
  }
}

// Check the JWT's own expiry rather than trusting stale session metadata.
async function freshToken(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const { data, error } = await supabase.auth.getSession();
  if (error) return refreshAccessToken();
  const session = data.session;
  if (!session) return undefined;

  const jwtExpiresAt = tokenExpiresAt(session.access_token);
  const sessionExpiresAt = (session.expires_at ?? 0) * 1000;
  const expiresAt = jwtExpiresAt || sessionExpiresAt;
  if (!expiresAt || expiresAt - Date.now() < 5 * 60_000) return refreshAccessToken();

  return session.access_token;
}

export const attachFreshSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await freshToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
