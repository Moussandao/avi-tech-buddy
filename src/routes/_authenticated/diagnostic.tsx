import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Camera, ImagePlus, Loader2, Stethoscope } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SpeakButton } from "@/components/SpeakButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useDiagnoses } from "@/lib/data";
import { diagnosePoultry, type DiagnosisResult } from "@/lib/diagnose.functions";
import { useSettings } from "@/lib/i18n";
import { useOnlineStatus } from "@/lib/outbox";

export const Route = createFileRoute("/_authenticated/diagnostic")({
  head: () => ({
    meta: [
      { title: "Diagnostic vétérinaire — AviTech" },
      {
        name: "description",
        content: "Photographiez une volaille et obtenez une analyse vétérinaire assistée par IA.",
      },
      { property: "og:title", content: "Diagnostic vétérinaire — AviTech" },
      {
        property: "og:description",
        content: "Analyse IA des symptômes visibles et recommandations adaptées aux petits élevages.",
      },
    ],
  }),
  component: Diagnostic,
});

/** Downscale a photo so it uploads quickly on a weak mobile connection. */
async function toCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1024;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const header = parts[0] ?? "";
  const base64 = parts[1] ?? "";
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const SEVERITY_STYLE: Record<DiagnosisResult["severity"], string> = {
  low: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
};

function Diagnostic() {
  const { t, language } = useSettings();
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const { data: history = [] } = useDiagnoses();
  const runDiagnosis = useServerFn(diagnosePoultry);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await toCompressedDataUrl(file);
      setPreview(dataUrl);
      setResult(null);
    } catch {
      toast.error(t("error"));
    }
  };

  const analyze = async () => {
    if (!preview) return;
    if (!online) {
      toast.error(t("diagnosisOffline"));
      return;
    }
    setLoading(true);
    try {
      const diagnosis = await runDiagnosis({ data: { imageDataUrl: preview, language } });
      setResult(diagnosis);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      let imagePath: string | null = null;
      if (userId) {
        const path = `${userId}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("diagnoses")
          .upload(path, dataUrlToBlob(preview), { contentType: "image/jpeg" });
        if (!uploadError) imagePath = path;
        await supabase.from("diagnoses").insert({
          user_id: userId,
          image_path: imagePath,
          disease: diagnosis.disease,
          severity: diagnosis.severity,
          summary: diagnosis.summary,
          recommendations: diagnosis.recommendations,
          language,
        });
        queryClient.invalidateQueries({ queryKey: ["diagnoses"] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("AI_RATE_LIMIT")) toast.error("⏳ " + t("error"));
      else if (message.includes("AI_NO_CREDITS")) toast.error(t("error"));
      else toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const spoken = result
    ? `${result.disease}. ${result.summary} ${result.recommendations.join(". ")}`
    : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">{t("diagnosticTitle")}</h1>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed bg-secondary/50">
              <Stethoscope className="size-16 text-muted-foreground" />
            </div>
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-14 gap-2" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-5" />
              {t("takePhoto")}
            </Button>
            <Button variant="secondary" className="h-14 gap-2" onClick={() => galleryRef.current?.click()}>
              <ImagePlus className="size-5" />
              {t("choosePhoto")}
            </Button>
          </div>

          <Button className="h-14 w-full text-base" disabled={!preview || loading} onClick={analyze}>
            {loading ? <Loader2 className="me-2 size-5 animate-spin" /> : <Stethoscope className="me-2 size-5" />}
            {loading ? t("analyzing") : t("analyze")}
          </Button>
          {!online && <p className="text-center text-sm text-warning">{t("diagnosisOffline")}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display text-xl">{result.disease}</CardTitle>
              <Badge className={SEVERITY_STYLE[result.severity]}>
                {t(`severity_${result.severity}` as "severity_low")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed">{result.summary}</p>
            <div>
              <h3 className="mb-2 font-semibold">{t("recommendations")}</h3>
              <ul className="space-y-2">
                {result.recommendations.map((item, index) => (
                  <li key={index} className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-sm">
                    <span className="font-semibold text-primary">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <SpeakButton text={spoken} />
            <p className="flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              {t("disclaimer")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("diagnosisHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("noDiagnosis")}</p>
          ) : (
            <ul className="divide-y">
              {history.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.disease}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={SEVERITY_STYLE[item.severity]}>
                    {t(`severity_${item.severity}` as "severity_low")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
