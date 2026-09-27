import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Attaches a fresh bearer token to every server function call.
// Refreshes the session when the stored token is expired or about to expire,
// so a stale token left in storage never reaches the server.
async function freshToken(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return undefined;
  const expiresAt = (session.expires_at ?? 0) * 1000;
  if (expiresAt - Date.now() < 60_000) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token;
  }
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
