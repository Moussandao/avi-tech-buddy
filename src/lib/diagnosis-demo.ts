export interface DiagnosisResult {
  disease: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  recommendations: string[];
  isDemo: boolean;
}

type Lang = "fr" | "en" | "ar";

const DEMO: Record<Lang, Omit<DiagnosisResult, "severity" | "isDemo">> = {
  fr: {
    disease: "Suspicion de Coccidiose (Signes : léthargie et plumage ébouriffé)",
    summary: "Résultat de démonstration : l'analyse en ligne n'a pas répondu à temps.",
    recommendations: ["Isoler les sujets atteints", "Administrer un anticoccidien", "Renouveler la litière"],
  },
  en: {
    disease: "Suspicion of Coccidiosis (Signs: lethargy and ruffled feathers)",
    summary: "Demo result: the online analysis did not respond in time.",
    recommendations: ["Isolate affected birds", "Give an anticoccidial treatment", "Replace the litter"],
  },
  ar: {
    disease: "اشتباه في داء الكوكسيديا (الأعراض: خمول وريش منفوش)",
    summary: "نتيجة تجريبية: لم يستجب التحليل عبر الإنترنت في الوقت المحدد.",
    recommendations: ["عزل الطيور المصابة", "إعطاء دواء مضاد للكوكسيديا", "تجديد الفرشة"],
  },
};

export function demoDiagnosis(language: Lang): DiagnosisResult {
  return { ...DEMO[language], severity: "high", isDemo: true };
}
