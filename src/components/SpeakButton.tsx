import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/i18n";
import { synthesizeSpeech } from "@/lib/tts.functions";
import { speak, stopSpeaking } from "@/lib/voice";

const audioCache = new Map<string, string>();

export function SpeakButton({ text, label }: { text: string; label?: string }) {
  const { language, t } = useSettings();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelled = useRef(false);

  const stopAll = () => {
    cancelled.current = true;
    audioRef.current?.pause();
    audioRef.current = null;
    stopSpeaking();
    setState("idle");
  };

  useEffect(() => () => stopAll(), []);

  const fallback = async () => {
    const ok = await speak(text, language, () => setState("idle"));
    if (ok) setState("playing");
    else {
      setState("idle");
      toast.error(t("noVoice"));
    }
  };

  const start = async () => {
    cancelled.current = false;
    const key = `${language}:${text}`;
    let src = audioCache.get(key);
    if (!src && navigator.onLine) {
      setState("loading");
      try {
        const res = await synthesizeSpeech({ data: { text: text.slice(0, 3000), language } });
        if (res.audio) {
          src = res.audio;
          audioCache.set(key, src);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (cancelled.current) return;
    if (!src) return fallback();
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setState("idle");
    audio.onerror = () => void fallback();
    try {
      await audio.play();
      setState("playing");
    } catch {
      void fallback();
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-11 gap-2"
      aria-label={t("listen")}
      onClick={() => (state === "idle" ? void start() : stopAll())}
    >
      {state === "loading" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : state === "playing" ? (
        <VolumeX className="size-4" />
      ) : (
        <Volume2 className="size-4" />
      )}
      {state === "loading" ? t("audioLoading") : state === "playing" ? t("stopListening") : (label ?? t("listen"))}
    </Button>
  );
}
