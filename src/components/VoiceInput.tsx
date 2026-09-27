import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/i18n";
import { useSpeechInput } from "@/lib/voice";
import { cn } from "@/lib/utils";

export function VoiceInput({
  onText,
  className,
}: {
  onText: (text: string) => void;
  className?: string;
}) {
  const { language, t } = useSettings();
  const { listening, supported, start, stop } = useSpeechInput(language, onText);

  return (
    <Button
      type="button"
      variant={listening ? "default" : "secondary"}
      size="icon"
      aria-label={listening ? t("listening") : t("speakNote")}
      title={listening ? t("listening") : t("speakNote")}
      className={cn("shrink-0", listening && "animate-pulse", className)}
      onClick={() => {
        if (!supported) {
          toast.error(t("voiceUnsupported"));
          return;
        }
        if (listening) stop();
        else start();
      }}
    >
      {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
    </Button>
  );
}
