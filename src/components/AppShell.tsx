import { AppLogo } from "@/components/AppLogo";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bird,
  CloudOff,
  Coins,
  Globe,
  LogOut,
  Moon,
  Stethoscope,
  Sun,
  Wifi,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useCachePersistence, useOutboxSync, useProfile, useUpdateProfile } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/currency";
import { LANGUAGES, type Language } from "@/lib/translations";
import { useOnlineStatus, useOutbox } from "@/lib/outbox";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "nav_dashboard", icon: BarChart3 },
  { to: "/diagnostic", key: "nav_diagnostic", icon: Stethoscope },
  { to: "/flock", key: "nav_flock", icon: Bird },
  { to: "/finances", key: "nav_finance", icon: Coins },
] as const;

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("avitech.theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("avitech.theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return { dark, toggle };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, language, setLanguage, currency, setCurrency } = useSettings();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const online = useOnlineStatus();
  const pending = useOutbox();
  const { dark, toggle } = useDarkMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useOutboxSync();
  useCachePersistence();

  // Apply the saved preferences from the farm profile once it loads.
  useEffect(() => {
    if (!profile) return;
    if (profile.language && profile.language !== language) {
      setLanguage(profile.language as Language);
    }
    if (profile.currency && profile.currency !== currency) {
      setCurrency(profile.currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    updateProfile.mutate({ language: lang });
  };
  const changeCurrency = (code: string) => {
    setCurrency(code);
    updateProfile.mutate({ currency: code });
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    localStorage.removeItem("avitech.cache");
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <AppLogo />
          <span className="font-display text-2xl font-semibold">{t("appName")}</span>
        </div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-5" />
              {t(item.key)}
            </Link>
          );
        })}
        <div className="mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="size-5" />
            {t("signOut")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-3">
            <AppLogo className="size-8 md:hidden" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-semibold leading-tight">
                {profile?.farm_name || t("appName")}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("gap-1 text-[11px]", !online && "bg-warning text-warning-foreground")}
                >
                  {online ? <Wifi className="size-3" /> : <CloudOff className="size-3" />}
                  {online ? t("offlineReady") : t("offline")}
                </Badge>
                {pending.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("pendingSync", { n: pending.length })}
                  </span>
                )}
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("theme")}>
              {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-1 font-semibold">
                  <Globe className="size-4" />
                  {language.toUpperCase()} · {currency}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => changeLanguage(l.code)}>
                    <span className="me-2">{l.flag}</span>
                    {l.label}
                    {language === l.code && <span className="ms-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("currency")}</DropdownMenuLabel>
                <div className="max-h-56 overflow-y-auto">
                  {CURRENCIES.map((c) => (
                    <DropdownMenuItem key={c.code} onClick={() => changeCurrency(c.code)}>
                      <span className="font-mono text-xs">{c.code}</span>
                      <span className="ms-2 text-muted-foreground">{c.symbol}</span>
                      {currency === c.code && <span className="ms-auto">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="size-4 me-2" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4 md:pb-8">{children}</main>

        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 pt-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-6", active && "stroke-[2.5]")} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
