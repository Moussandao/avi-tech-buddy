import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/i18n";

export function VoiceRecorder({
  value,
  onChange,
}: {
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
}) {
  const { t } = useSettings();
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(value);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  if (typeof window !== "undefined" && typeof MediaRecorder === "undefined")
    return <p className="text-sm text-muted-foreground">{t("micUnavailable")}</p>;

  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error(t("micUnavailable"));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
        (m) => MediaRecorder.isTypeSupported?.(m),
      );
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        onChange(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      setRecording(false);
      const name = (e as { name?: string })?.name;
      toast.error(name === "NotAllowedError" || name === "SecurityError" ? t("micDenied") : t("micUnavailable"));
    }
  };

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <audio src={url} controls className="h-10 flex-1" />
        <Button type="button" variant="ghost" size="icon" aria-label={t("removeVoice")} onClick={() => onChange(null)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    );
  }

  return recording ? (
    <Button type="button" variant="destructive" className="h-12 w-full gap-2" onClick={() => recorderRef.current?.stop()}>
      <Square className="size-4" />
      {t("stopRecording")}
    </Button>
  ) : (
    <Button type="button" variant="outline" className="h-12 w-full gap-2" onClick={start}>
      <Mic className="size-4" />
      {t("recordVoice")}
    </Button>
  );
}

export function VoiceNotePlayer({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("poultry-voice-notes")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive && data) setUrl(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return null;
  return <audio src={url} controls preload="none" className="mt-1 h-8 w-full max-w-xs" />;
}
