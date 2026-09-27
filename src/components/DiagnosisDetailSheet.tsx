import { AlertTriangle, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

import { SpeakButton } from "@/components/SpeakButton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Diagnosis } from "@/lib/data";
import { useSettings } from "@/lib/i18n";

export const SEVERITY_STYLE: Record<Diagnosis["severity"], string> = {
  low: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-destructive text-destructive-foreground",
  critical: "bg-destructive text-destructive-foreground ring-2 ring-destructive ring-offset-2 animate-pulse",
};

export function DiagnosisDetailSheet({
  diagnosis,
  onClose,
}: {
  diagnosis: Diagnosis | null;
  onClose: () => void;
}) {
  const { t, dir, language } = useSettings();
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhoto(null);
    setPhotoFailed(false);
    const path = diagnosis?.image_path;
    if (!path) return;
    let cancelled = false;
    (async () => {
      for (const bucket of ["poultry-health-images", "diagnoses"]) {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
        if (data?.signedUrl) {
          if (!cancelled) setPhoto(data.signedUrl);
          return;
        }
      }
      if (!cancelled) setPhotoFailed(true);
    })().catch(() => !cancelled && setPhotoFailed(true));
    return () => {
      cancelled = true;
    };
  }, [diagnosis?.image_path]);

  const d = diagnosis;
  const spoken = d
    ? [d.disease, d.summary ?? "", ...d.recommendations].filter(Boolean).join(". ")
    : "";

  return (
    <Sheet open={!!d} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" dir={dir} className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        {d && (
          <>
            <SheetHeader className="text-start">
              <SheetDescription>{t("diagnosisDetail")}</SheetDescription>
              <SheetTitle className="font-display text-xl">{d.disease}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={SEVERITY_STYLE[d.severity]}>
                  {t(`severity_${d.severity}` as "severity_low")}
                </Badge>
                {d.is_demo && <Badge variant="outline">{t("demoLabel")}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleString(language)}
                </span>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {d.image_path &&
                (photo ? (
                  <img
                    src={photo}
                    alt={d.disease}
                    onError={() => setPhotoFailed(true)}
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                ) : photoFailed ? (
                  <p className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                    <ImageOff className="size-4" /> {t("photoUnavailable")}
                  </p>
                ) : (
                  <div className="aspect-video w-full animate-pulse rounded-xl bg-secondary/60" />
                ))}

              {d.summary && <p className="text-base leading-relaxed">{d.summary}</p>}

              {d.recommendations.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">{t("recommendations")}</h3>
                  <ul className="space-y-2">
                    {d.recommendations.map((item, index) => (
                      <li key={index} className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-sm">
                        <span className="font-semibold text-primary">{index + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <SpeakButton text={spoken} />
              <p className="flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                {t("disclaimer")}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
