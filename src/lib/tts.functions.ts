import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TTS_MODEL = "google/gemini-3.1-flash-tts-preview";

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ text: z.string().min(1).max(3000), language: z.enum(["fr", "en", "ar"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { audio: null as string | null, error: "config" };
    const prefix =
      data.language === "fr"
        ? "Lis calmement en français : "
        : data.language === "ar"
          ? "اقرأ بهدوء باللغة العربية: "
          : "Read calmly in English: ";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TTS_MODEL,
        contents: [{ role: "user", parts: [{ text: prefix + data.text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
        stream_format: "audio",
      }),
    });
    if (!res.ok) {
      console.error(`TTS failed [${res.status}]: ${await res.text()}`);
      return { audio: null, error: String(res.status) };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || "audio/wav";
    return { audio: `data:${mime.split(";")[0]};base64,${buf.toString("base64")}`, error: null };
  });
