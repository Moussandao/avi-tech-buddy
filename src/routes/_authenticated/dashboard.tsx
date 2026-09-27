import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, Stethoscope, Thermometer, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { SpeakButton } from "@/components/SpeakButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  batchAlive,
  useBatchEvents,
  useBatches,
  useCreateRow,
  useReadings,
  useTransactions,
} from "@/lib/data";
import { useSettings } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — AviTech" },
      { name: "description", content: "Vue d'ensemble de votre élevage : effectif, mortalité, solde et climat." },
      { property: "og:title", content: "Tableau de bord — AviTech" },
      { property: "og:description", content: "Suivez vos indicateurs d'élevage en un coup d'œil." },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p
            className={
              tone === "positive"
                ? "font-display text-xl font-semibold text-success"
                : tone === "negative"
                  ? "font-display text-xl font-semibold text-destructive"
                  : "font-display text-xl font-semibold"
            }
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { t, money } = useSettings();
  const { data: batches = [], isPending } = useBatches();
  const { data: events = [] } = useBatchEvents();
  const { data: readings = [] } = useReadings();
  const { data: transactions = [] } = useTransactions();
  const createReading = useCreateRow("readings");

  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [readingBatch, setReadingBatch] = useState("none");

  const active = batches.filter((b) => b.is_active);
  const headcount = active.reduce((sum, b) => sum + batchAlive(b, events), 0);
  const initial = active.reduce((sum, b) => sum + b.initial_count, 0);
  const dead = Math.max(0, initial - headcount);
  const mortality = initial > 0 ? (dead / initial) * 100 : 0;

  const sales = transactions.filter((x) => x.kind === "sale").reduce((s, x) => s + Number(x.amount), 0);
  const expenses = transactions
    .filter((x) => x.kind === "expense")
    .reduce((s, x) => s + Number(x.amount), 0);
  const balance = sales - expenses;

  const latest = readings[0];
  const chartData = [...readings]
    .slice(0, 24)
    .reverse()
    .map((r) => ({
      time: new Date(r.recorded_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: r.temperature ?? null,
      humidity: r.humidity ?? null,
    }));

  const summary = `${t("kpi_headcount")}: ${headcount}. ${t("kpi_mortality")}: ${mortality.toFixed(1)}%. ${t("kpi_balance")}: ${money(balance)}.`;

  const addReading = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!temperature && !humidity) return;
    const result = await createReading.mutateAsync({
      temperature: temperature ? Number(temperature) : null,
      humidity: humidity ? Number(humidity) : null,
      batch_id: readingBatch === "none" ? null : readingBatch,
      recorded_at: new Date().toISOString(),
    });
    toast.success(result.queued ? t("savedOffline") : t("saved"));
    setTemperature("");
    setHumidity("");
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">{t("nav_dashboard")}</h1>
        <SpeakButton text={summary} label={t("readSummary")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={Users} label={t("kpi_headcount")} value={String(headcount)} />
        <Kpi
          icon={TrendingDown}
          label={t("kpi_mortality")}
          value={`${mortality.toFixed(1)} %`}
          tone={mortality > 5 ? "negative" : "default"}
        />
        <Kpi
          icon={TrendingUp}
          label={t("kpi_balance")}
          value={money(balance)}
          tone={balance >= 0 ? "positive" : "negative"}
        />
        <Kpi
          icon={Thermometer}
          label={t("kpi_climate")}
          value={
            latest
              ? `${latest.temperature ?? "–"}° / ${latest.humidity ?? "–"}%`
              : "– / –"
          }
        />
      </div>

      <Button asChild size="lg" className="h-14 w-full gap-2 text-base">
        <Link to="/diagnostic">
          <Stethoscope className="size-5" />
          {t("ctaDiagnose")}
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("chartClimate")}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noReadings")}</p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="var(--color-chart-1)"
                    fill="var(--color-chart-1)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke="var(--color-chart-2)"
                    fill="var(--color-chart-2)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <form className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={addReading}>
            <div className="space-y-1">
              <Label htmlFor="temp" className="flex items-center gap-1 text-xs">
                <Thermometer className="size-3" />
                {t("temperature")}
              </Label>
              <Input
                id="temp"
                inputMode="decimal"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hum" className="flex items-center gap-1 text-xs">
                <Droplets className="size-3" />
                {t("humidity")}
              </Label>
              <Input
                id="hum"
                inputMode="decimal"
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-3">
              <Label className="text-xs">{t("linkedBatch")}</Label>
              <Select value={readingBatch} onValueChange={setReadingBatch}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("none")}</SelectItem>
                  {active.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="col-span-2 h-12 sm:col-span-3">
              {t("addReading")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
