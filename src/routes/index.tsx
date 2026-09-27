import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bird, Coins, Egg, Stethoscope, WifiOff } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/i18n";
import { LANGUAGES, type Language } from "@/lib/translations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AviTech — Gestion avicole pan-africaine" },
      {
        name: "description",
        content:
          "AviTech aide les éleveurs de volailles à suivre leurs lots, leurs finances et la santé de leurs animaux, même hors connexion.",
      },
      { property: "og:title", content: "AviTech — Gestion avicole pan-africaine" },
      {
        property: "og:description",
        content:
          "Suivi du cheptel, diagnostic vétérinaire assisté par IA et gestion financière en français, anglais et arabe.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, language, setLanguage } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const features = [
    { icon: Stethoscope, key: "diagnosticTitle" as const },
    { icon: Bird, key: "flockTitle" as const },
    { icon: Coins, key: "financeTitle" as const },
    { icon: WifiOff, key: "offlineReady" as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Egg className="size-7 text-primary" />
          <span className="font-display text-2xl font-bold">{t("appName")}</span>
        </div>
        <div className="flex gap-1">
          {LANGUAGES.map((l) => (
            <Button
              key={l.code}
              size="sm"
              variant={language === l.code ? "default" : "ghost"}
              onClick={() => setLanguage(l.code as Language)}
            >
              {l.flag}
            </Button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
          {t("tagline")}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">{t("heroText")}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-14 text-base">
            <Link to="/auth" search={{ mode: "signup" }}>
              {t("getStarted")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-14 text-base">
            <Link to="/auth" search={{ mode: "signin" }}>
              {t("signIn")}
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="rounded-2xl border bg-card p-5 text-start shadow-sm"
            >
              <Icon className="size-7 text-primary" />
              <p className="mt-3 font-semibold">{t(key)}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
