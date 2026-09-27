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
const AI_MODEL = "openai/gpt-6-astra";
const TIMEOUT_MS = 40000;

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[“”]/g, '"')
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json in model output");
  return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1"));
}

/** Fallback: read a free-text answer (Diagnosis: ... / Severity: ... / bullet actions). */
function parseFreeText(text: string): z.infer<typeof outputSchema> | null {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[*#_]/g, "").trim()).filter(Boolean);
  const pick = (re: RegExp) => {
    const line = lines.find((l) => re.test(l));
    return line ? line.replace(re, "").replace(/^[\s:：-]+/, "").trim() : "";
  };
  const diagnosis = pick(/^"?(diagnosis|diagnostic|maladie|التشخيص)"?\s*[:：]/i);
  if (!diagnosis) return null;
  const severity = pick(/^"?(severity|gravité|gravite|الخطورة)"?\s*[:：]/i) || "medium";
  const summary = pick(/^"?(summary|résumé|resume|الملخص)"?\s*[:：]/i);
  const actions = lines
    .filter((l) => /^(\d+[.)]|[-•])\s+/.test(l))
    .map((l) => l.replace(/^(\d+[.)]|[-•])\s+/, ""))
    .slice(0, 5);
  return { diagnosis, severity, summary, recommended_actions: actions };
}

async function askModel(apiKey: string, prompt: string, image: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: image },
          ],
        },
      ],
    }),
  });
  if (response.status === 429) throw new Error("AI_RATE_LIMIT");
  if (response.status === 402 || response.status === 403) throw new Error("AI_NO_CREDITS");
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} ${await response.text().catch(() => "")}`.slice(0, 400));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        } catch {
          /* partial */
        }
      }
    }
  }
  return text;
}

function readAnswer(content: string): z.infer<typeof outputSchema> | null {
  try {
    return outputSchema.parse(extractJson(content));
  } catch {
    return parseFreeText(content);
  }
}

export const diagnosePoultry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DiagnosisResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return demoDiagnosis(data.language);

    const prompt = `You are an experienced poultry veterinarian working with small African farms.
Analyse the poultry photo and answer ONLY with a JSON object with keys:
"diagnosis" (most likely disease or problem, with visible signs in parentheses),
"severity" (exactly "low", "medium", "high" or "critical"),
"summary" (max 2 sentences on what you see; say so if the image is unclear),
"recommended_actions" (3 to 5 concrete actions doable with local means).
Write every text value in ${LANGUAGE_NAME[data.language]}.
Your reply must start with { and end with }. No markdown, no explanation outside the JSON.
Example: {"diagnosis":"...","severity":"medium","summary":"...","recommended_actions":["...","...","..."]}`;
    const strictPrompt = `${prompt}
IMPORTANT: your previous answer was not valid JSON. Reply with the JSON object only, even if the image is unclear (then say so in "summary").`;

    try {
      const startedAt = Date.now();
      let content = await askModel(apiKey, prompt, data.imageDataUrl);
      let parsed = readAnswer(content);
      if (!parsed && Date.now() - startedAt < 20000) {
        console.warn("AI diagnosis: unreadable answer, retrying", content.slice(0, 300));
        content = await askModel(apiKey, strictPrompt, data.imageDataUrl);
        parsed = readAnswer(content);
      }
      if (!parsed) {
        console.error("AI diagnosis failed: unreadable answer after retry", content.slice(0, 300));
        return demoDiagnosis(data.language);
      }
      const sev = parsed.severity.toLowerCase();
      const severity: DiagnosisResult["severity"] =
        /low|faible|bas|منخفض/.test(sev)
          ? "low"
          : /critic|critique|حرج/.test(sev)
            ? "critical"
            : /high|élev|elev|grave|مرتفع|عال/.test(sev)
              ? "high"
              : "medium";
      return {
        disease: parsed.diagnosis.slice(0, 200),
        severity,
        summary: (parsed.summary ?? "").slice(0, 600),
        recommendations: parsed.recommended_actions.slice(0, 6).map((r) => r.slice(0, 300)),
        isDemo: false,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("AI_")) throw error;
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      console.error(timedOut ? "AI diagnosis failed: timeout" : "AI diagnosis failed: network", error);
      return demoDiagnosis(data.language);
    }
  });
