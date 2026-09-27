import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Local session check (no network): data access is still enforced server-side.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    return { user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
