import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { VoiceInput } from "@/components/VoiceInput";
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
  component: Finances;
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

  const categories = kind === "expense" ? EXPENSE_CATEGORIES : SALE_CATEGORIES;

  const totalExpense = transactions
    .filter((x) => x.kind === "expense")
    .reduce((s, x) => s + Number(x.amount), 0);
  const totalSale = transactions
    .filter((x) => x.kind === "sale")
    .reduce((s, x) => s + Number(x.amount), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createTransaction.mutateAsync({
      kind,
      category,
      amount: Number(amount || 0),
      currency,
      batch_id: batchId === "none" ? null : batchId,
      note: note || null,
      occurred_at: new Date().toISOString(),
    });
    toast.success(result.queued ? t("savedOffline") : t("saved"));
    setAmount("");
    setNote("");
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
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
                      {t((`cat_${item.category}` as TranslationKey) in ({} as never)
                        ? ("cat_other" as TranslationKey)
                        : (`cat_${item.category}` as TranslationKey))}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(item.occurred_at).toLocaleDateString()}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete")}
                    onClick={() => deleteTransaction.mutate(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
