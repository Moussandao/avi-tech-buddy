import { Mic, MicOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettings } from "@/lib/i18n";
import { parseTransaction, type ParsedTransaction } from "@/lib/parse-transaction";
import { useSpeechInput } from "@/lib/voice";
import { cn } from "@/lib/utils";

export function VoiceTransactionDialog({
  onApply,
}: {
  onApply: (parsed: ParsedTransaction, transcript: string) => void;
}) {
  const { t, language, money } = useSettings();
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const parsed = transcript ? parseTransaction(transcript) : null;
  const { listening, supported, start, stop } = useSpeechInput(language, setTranscript);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          stop();
          setTranscript("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" className="h-12 w-full gap-2 text-base">
          <Mic className="size-5" />
          {t("voiceEntry")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("voiceEntry")}</DialogTitle>
          <DialogDescription>{t("voiceTapToSpeak")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <button
            type="button"
            disabled={!supported}
            onClick={listening ? stop : start}
            aria-label={t("voiceEntry")}
            className={cn(
              "flex size-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-40",
              listening && "animate-pulse ring-8 ring-primary/30",
            )}
          >
            {supported ? <Mic className="size-14" /> : <MicOff className="size-14" />}
          </button>
          {!supported && (
            <p role="status" className="text-center text-sm text-warning">
              {t("voiceUnsupported")}
            </p>
          )}
          {transcript && (
            <div className="w-full space-y-2 rounded-xl bg-secondary p-3 text-sm">
              <p className="italic">« {transcript} »</p>
              {parsed && (
                <p className="text-muted-foreground">
                  {parsed.kind ? t(parsed.kind) : "—"} ·{" "}
                  {parsed.amount !== null ? money(parsed.amount) : "—"}
                  {parsed.currency ? ` (${parsed.currency})` : ""}
                </p>
              )}
            </div>
          )}
          <Button
            className="h-12 w-full"
            disabled={!parsed}
            onClick={() => {
              if (parsed) onApply(parsed, transcript);
              setOpen(false);
              setTranscript("");
            }}
          >
            {t("voiceApply")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
