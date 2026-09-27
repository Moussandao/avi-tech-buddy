import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  imageDataUrl: z.string(),
  language: z.enum(["fr", "en", "ar"]),
});

export interface DiagnosisResult {
  disease: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  recommendations: string[];
}

const LANGUAGE_NAME = { fr: "français", en: "English", ar: "العربية" } as const;

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
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

    const prompt = `Tu es un vétérinaire aviaire expérimenté travaillant avec de petits élevages africains.
Analyse la photo de volaille fournie et réponds UNIQUEMENT par un objet JSON avec ces clés :
"disease" (nom de la maladie ou anomalie la plus probable),
"severity" (exactement "low", "medium", "high" ou "critical" si danger de mort rapide pour le lot),
"summary" (2 phrases maximum expliquant ce que tu observes),
"recommendations" (liste de 3 à 5 actions concrètes, réalisables avec des moyens locaux).
Rédige tous les textes en ${LANGUAGE_NAME[data.language]}. Reste prudent : si l'image est peu lisible, dis-le dans "summary".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: data.imageDataUrl },
            ],
          },
        ],
      }),
    });

    if (response.status === 429) throw new Error("AI_RATE_LIMIT");
    if (response.status === 402) throw new Error("AI_NO_CREDITS");
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      console.error("AI gateway error", response.status, detail);
      throw new Error("AI_ERROR");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            text?: string;
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          } else if (event.type === "response.output_text.done" && typeof event.text === "string" && !text) {
            text = event.text;
          }
        } catch {
          /* ignore keep-alive fragments */
        }
      }
    }

    const parsed = extractJson(text) as Partial<DiagnosisResult>;
    const severity =
      parsed.severity === "low" || parsed.severity === "high" || parsed.severity === "critical"
        ? parsed.severity
        : "medium";

    return {
      disease: String(parsed.disease ?? "—").slice(0, 160),
      severity,
      summary: String(parsed.summary ?? "").slice(0, 600),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 6).map((r) => String(r).slice(0, 300))
        : [],
    };
  });
