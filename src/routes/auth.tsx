import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Egg, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/i18n";
import { LANGUAGES, type Language } from "@/lib/translations";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search.mode === "signup" ? "signup" : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Connexion — AviTech" },
      {
        name: "description",
        content: "Connectez-vous à AviTech pour suivre votre élevage de volailles.",
      },
      { property: "og:title", content: "Connexion — AviTech" },
      { property: "og:description", content: "Accédez à votre espace de gestion avicole AviTech." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t, language, setLanguage, currency } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [farmName, setFarmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { farm_name: farmName, language, currency },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Egg className="size-7 text-primary" />
            <span className="font-display text-2xl font-bold">{t("appName")}</span>
          </Link>
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
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signup" ? t("signUp") : t("signIn")}
          </h1>

          {sent ? (
            <p className="mt-4 rounded-xl bg-secondary p-4 text-sm">{t("authCheckEmail")}</p>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={submit}>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="farm">{t("farmName")}</Label>
                  <Input
                    id="farm"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12"
                />
              </div>
              <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
                {loading && <Loader2 className="me-2 size-4 animate-spin" />}
                {mode === "signup" ? t("signUp") : t("signIn")}
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? t("haveAccount") : t("noAccount")}{" "}
            <Link
              to="/auth"
              search={{ mode: mode === "signup" ? "signin" : "signup" }}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {mode === "signup" ? t("signIn") : t("signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
