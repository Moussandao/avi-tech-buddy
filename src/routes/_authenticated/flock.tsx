import { createFileRoute } from "@tanstack/react-router";
import { Bird, Plus, Syringe, Wheat, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { VoiceInput } from "@/components/VoiceInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchAlive, useBatchEvents, useBatches, useCreateRow, type BatchEvent } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import { parseSpokenAmount } from "@/lib/voice";

export const Route = createFileRoute("/_authenticated/flock")({
  head: () => ({
    meta: [
      { title: "Cheptel — AviTech" },
      { name: "description", content: "Gérez vos lots de volailles, la mortalité, les vaccinations et l'alimentation." },
      { property: "og:title", content: "Cheptel — AviTech" },
      { property: "og:description", content: "Suivi détaillé de chaque lot de votre élevage." },
    ],
  }),
  component: Flock,
});

const EVENT_TYPES: { value: BatchEvent["event_type"]; labelKey: "mortality" | "vaccination" | "feed"; icon: typeof Bird }[] = [
  { value: "mortality", labelKey: "mortality", icon: X },
  { value: "vaccination", labelKey: "vaccination", icon: Syringe },
  { value: "feed", labelKey: "feed", icon: Wheat },
];

function Flock() {
  const { t } = useSettings();
  const { data: batches = [] } = useBatches();
  const { data: events = [] } = useBatchEvents();
  const createBatch = useCreateRow("batches");
  const createEvent = useCreateRow("batch_events");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");

  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [eventType, setEventType] = useState<BatchEvent["event_type"]>("mortality");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  const submitBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createBatch.mutateAsync({
      name,
      breed: breed || null,
      start_date: startDate,
      initial_count: Number(count || 0),
      is_active: true,
    });
    toast.success(result.queued ? t("savedOffline") : t("saved"));
    setShowForm(false);
    setName("");
    setBreed("");
    setCount("");
  };

  const submitEvent = async (event: React.FormEvent, batchId: string) => {
    event.preventDefault();
    const result = await createEvent.mutateAsync({
      batch_id: batchId,
      event_type: eventType,
      quantity: Number(quantity || 0),
      note: note || null,
      occurred_at: new Date().toISOString(),
    });
    toast.success(result.queued ? t("savedOffline") : t("saved"));
    setQuantity("");
    setNote("");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">{t("flockTitle")}</h1>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-1">
          <Plus className="size-4" />
          {t("newBatch")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitBatch}>
              <div className="space-y-1">
                <Label htmlFor="name">{t("batchName")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="breed">{t("breed")}</Label>
                <Input id="breed" value={breed} onChange={(e) => setBreed(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">{t("startDate")}</Label>
                <Input
                  id="date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="count">{t("initialCount")}</Label>
                <Input
                  id="count"
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" className="h-12 flex-1">
                  {t("save")}
                </Button>
                <Button type="button" variant="secondary" className="h-12" onClick={() => setShowForm(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {batches.length === 0 && !showForm && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {t("noBatches")}
        </p>
      )}

      {batches.map((batch) => {
        const alive = batchAlive(batch, events);
        const open = activeBatch === batch.id;
        const batchEvents = events.filter((e) => e.batch_id === batch.id).slice(0, 6);
        return (
          <Card key={batch.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-display text-lg">{batch.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {batch.breed ? `${batch.breed} · ` : ""}
                    {new Date(batch.start_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-sm">
                  {alive} / {batch.initial_count} {t("alive")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant={open ? "secondary" : "outline"}
                className="h-11 w-full"
                onClick={() => setActiveBatch(open ? null : batch.id)}
              >
                {t("recordEvent")}
              </Button>

              {open && (
                <form className="space-y-3 rounded-2xl bg-secondary/60 p-3" onSubmit={(e) => submitEvent(e, batch.id)}>
                  <div className="grid grid-cols-3 gap-2">
                    {EVENT_TYPES.map(({ value, labelKey, icon: Icon }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={eventType === value ? "default" : "outline"}
                        className="h-auto flex-col gap-1 py-3 text-xs"
                        onClick={() => setEventType(value)}
                      >
                        <Icon className="size-4" />
                        {t(labelKey)}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`qty-${batch.id}`}>{t("quantity")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`qty-${batch.id}`}
                        inputMode="numeric"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className="h-12"
                      />
                      <VoiceInput
                        onText={(text) => {
                          const amount = parseSpokenAmount(text);
                          if (amount !== null) setQuantity(String(amount));
                          else setNote(text);
                        }}
                        className="h-12 w-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`note-${batch.id}`}>{t("note")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`note-${batch.id}`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="h-12"
                      />
                      <VoiceInput onText={(text) => setNote(text)} className="h-12 w-12" />
                    </div>
                  </div>
                  <Button type="submit" className="h-12 w-full">
                    {t("save")}
                  </Button>
                </form>
              )}

              {batchEvents.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {batchEvents.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 border-b py-1 last:border-0">
                      <span>{t(e.event_type)}</span>
                      <span className="text-muted-foreground">
                        {e.quantity} · {new Date(e.occurred_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
