import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/voice";

export function SpeakButton({ text, label }: { text: string; label?: string }) {
  const { language, t } = useSettings();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
          return;
        }
        speak(text, language);
        setSpeaking(true);
        window.setTimeout(() => setSpeaking(false), Math.min(60000, text.length * 90));
      }}
    >
      {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      {label ?? (speaking ? t("stopListening") : t("listen"))}
    </Button>
  );
}
