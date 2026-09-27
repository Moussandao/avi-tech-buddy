import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { VoiceInput } from "@/components/VoiceInput";
import { VoiceTransactionDialog } from "@/components/VoiceTransactionDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { SpeakButton } from "@/components/SpeakButton";
import { enqueue, flushOutbox } from "@/lib/outbox";
import { saveVoiceLocally, uploadVoice } from "@/lib/voice-store";
import { VoiceNotePlayer, VoiceRecorder } from "@/components/VoiceNote";
import { supabase } from "@/integrations/supabase/client";
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
import { useBatches, useCreateRow, useDeleteRow, useTransactions } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import { parseSpokenAmount } from "@/lib/voice";
import type { TranslationKey } from "@/lib/translations";

export const Route = createFileRoute("/_authenticated/finances")({
  head: () => ({
    meta: [
      { title: "Finances — AviTech" },
      { name: "description", content: "Suivez les dépenses et les ventes de votre élevage avicole." },
      { property: "og:title", content: "Finances — AviTech" },
      { property: "og:description", content: "Dépenses, ventes et solde de votre exploitation avicole." },
    ],
  }),
  component: Finances,
});

const EXPENSE_CATEGORIES: { value: string; key: TranslationKey }[] = [
  { value: "feed", key: "cat_feed" },
  { value: "medicine", key: "cat_medicine" },
  { value: "chicks", key: "cat_chicks" },
  { value: "equipment", key: "cat_equipment" },
  { value: "labor", key: "cat_labor" },
  { value: "other", key: "cat_other" },
];

const SALE_CATEGORIES: { value: string; key: TranslationKey }[] = [
  { value: "eggs", key: "cat_eggs" },
  { value: "poultry", key: "cat_poultry" },
  { value: "other", key: "cat_other" },
];

function Finances() {
  const { t, money, currency } = useSettings();
  const { data: transactions = [] } = useTransactions();
  const { data: batches = [] } = useBatches();
  const createTransaction = useCreateRow("transactions");
  const deleteTransaction = useDeleteRow("transactions");

  const [kind, setKind] = useState<"expense" | "sale">("expense");
  const [category, setCategory] = useState("feed");
  const [amount, setAmount] = useState("");
  const [batchId, setBatchId] = useState("none");
  const [note, setNote] = useState("");
  const [voice, setVoice] = useState<Blob | null>(null);

  const categories = kind === "expense" ? EXPENSE_CATEGORIES : SALE_CATEGORIES;

  const totalExpense = transactions
    .filter((x) => x.kind === "expense")
    .reduce((s, x) => s + Number(x.amount), 0);
  const totalSale = transactions
    .filter((x) => x.kind === "sale")
    .reduce((s, x) => s + Number(x.amount), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const row = {
      kind,
      category,
      amount: Number(amount || 0),
      currency,
      batch_id: batchId === "none" ? null : batchId,
      note: note || null,
      occurred_at: new Date().toISOString(),
    };
    let result: { queued: boolean };
    let voicePath: string | null = null;
    if (voice && navigator.onLine) voicePath = await uploadVoice(voice);
    if (voice && !voicePath) {
      // Offline or upload failed: keep the recording on the device and send it later with the expense.
      try {
        const key = await saveVoiceLocally(voice);
        enqueue("transactions", { ...row, __voice_key: key });
        if (navigator.onLine) void flushOutbox();
        result = { queued: true };
        toast.info(t("voiceSavedLater"));
      } catch {
        toast.error(t("voiceSaveFailed"));
        return;
      }
    } else {
      result = await createTransaction.mutateAsync({ ...row, voice_note_url: voicePath });
    }
    toast.success(result.queued ? t("savedOffline") : t("saved"));
    setAmount("");
    setNote("");
    setVoice(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">{t("financeTitle")}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalSale")}</p>
            <p className="font-display text-lg font-semibold text-success">{money(totalSale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalExpense")}</p>
            <p className="font-display text-lg font-semibold text-destructive">{money(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("balance")}</p>
            <p className="font-display text-lg font-semibold">{money(totalSale - totalExpense)}</p>
          </CardContent>
        </Card>
      </div>
      <SpeakButton
        label={t("readSummary")}
        text={`${t("totalSale")}: ${money(totalSale)}. ${t("totalExpense")}: ${money(totalExpense)}. ${t("balance")}: ${money(totalSale - totalExpense)}.`}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <VoiceTransactionDialog
              onApply={(p, text) => {
                if (p.kind) setKind(p.kind);
                if (p.category) setCategory(p.category);
                else if (p.kind) setCategory(p.kind === "sale" ? "eggs" : "feed");
                if (p.amount !== null) setAmount(String(p.amount));
                setNote(text);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={kind === "expense" ? "default" : "outline"}
                className="h-12 gap-2"
                onClick={() => {
                  setKind("expense");
                  setCategory("feed");
                }}
              >
                <ArrowDownCircle className="size-4" />
                {t("expense")}
              </Button>
              <Button
                type="button"
                variant={kind === "sale" ? "default" : "outline"}
                className="h-12 gap-2"
                onClick={() => {
                  setKind("sale");
                  setCategory("eggs");
                }}
              >
                <ArrowUpCircle className="size-4" />
                {t("sale")}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="amount">{t("amount")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="h-12"
                  />
                  <VoiceInput
                    onText={(text) => {
                      const value = parseSpokenAmount(text);
                      if (value !== null) setAmount(String(value));
                      else setNote(text);
                    }}
                    className="h-12 w-12"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("category")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {t(c.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("linkedBatch")}</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("none")}</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="fnote">{t("note")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="fnote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-12"
                  />
                  <VoiceInput onText={setNote} className="h-12 w-12" />
                </div>
              </div>
            </div>

            <VoiceRecorder value={voice} onChange={setVoice} />

            <Button type="submit" className="h-12 w-full">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("events")}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noTransactions")}</p>
          ) : (
            <ul className="divide-y">
              {transactions.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  {item.kind === "sale" ? (
                    <ArrowUpCircle className="size-5 shrink-0 text-success" />
                  ) : (
                    <ArrowDownCircle className="size-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {t(`cat_${item.category}` as TranslationKey)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(item.occurred_at).toLocaleDateString()}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                    {item.voice_note_url && <VoiceNotePlayer path={item.voice_note_url} />}
                  </div>
                  <span
                    className={
                      item.kind === "sale"
                        ? "font-semibold text-success"
                        : "font-semibold text-destructive"
                    }
                  >
                    {money(Number(item.amount), item.currency)}
                  </span>
                  <ConfirmDeleteDialog
                    description={`${t(`cat_${item.category}` as TranslationKey)} · ${money(Number(item.amount), item.currency)} — ${t("confirmDeleteDesc")}`}
                    onConfirm={() =>
                      deleteTransaction.mutate(item.id, {
                        onSuccess: () => toast.success(t("deleted")),
                        onError: (e) => toast.error((e as Error).message),
                      })
                    }
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={t("delete")}>
                        <Trash2 className="size-4" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
