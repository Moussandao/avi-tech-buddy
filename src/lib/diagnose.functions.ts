import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { demoDiagnosis, type DiagnosisResult } from "@/lib/diagnosis-demo";

export type { DiagnosisResult } from "@/lib/diagnosis-demo";

const inputSchema = z.object({
  imageDataUrl: z.string().max(4_000_000),
  language: z.enum(["fr", "en", "ar"]),
});

const outputSchema = z.object({
  diagnosis: z.string().min(1),
  severity: z.string(),
  summary: z.string().optional(),
  recommended_actions: z.array(z.string()).default([]),
});

const LANGUAGE_NAME = { fr: "français", en: "English", ar: "العربية" } as const;
const NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";
const TIMEOUT_MS = 8000;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export const diagnosePoultry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DiagnosisResult> => {
    const apiKey = process.env["NVIDIA_API_KEY"];
    if (!apiKey) return demoDiagnosis(data.language);

    const prompt = `You are an experienced poultry veterinarian working with small African farms.
Analyse the poultry photo and answer ONLY with a JSON object with keys:
"diagnosis" (most likely disease or problem, with visible signs in parentheses),
"severity" (exactly "low", "medium", "high" or "critical"),
"summary" (max 2 sentences on what you see; say so if the image is unclear),
"recommended_actions" (3 to 5 concrete actions doable with local means).
Write every text value in ${LANGUAGE_NAME[data.language]}.`;

    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          max_tokens: 600,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: data.imageDataUrl } },
              ],
            },
          ],
        }),
      });
      if (!response.ok) {
        console.error("NVIDIA error", response.status, await response.text().catch(() => ""));
        return demoDiagnosis(data.language);
      }
      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const parsed = outputSchema.parse(extractJson(json.choices?.[0]?.message?.content ?? ""));
      const sev = parsed.severity.toLowerCase();
      const severity: DiagnosisResult["severity"] =
        sev === "low" || sev === "high" || sev === "critical" ? sev : "medium";
      return {
        disease: parsed.diagnosis.slice(0, 200),
        severity,
        summary: (parsed.summary ?? "").slice(0, 600),
        recommendations: parsed.recommended_actions.slice(0, 6).map((r) => r.slice(0, 300)),
        isDemo: false,
      };
    } catch (error) {
      console.error("NVIDIA diagnosis failed, using demo", error);
      return demoDiagnosis(data.language);
    }
  });
