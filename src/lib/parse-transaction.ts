export interface ParsedTransaction {
  kind: "expense" | "sale" | null;
  category: string | null;
  amount: number | null;
  currency: string | null;
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

const CURRENCY_WORDS: [string, string[]][] = [
  ["XOF", ["franc cfa", "francs cfa", "fcfa", "cfa", "xof", "فرنك"]],
  ["MAD", ["dirham", "dh", "mad", "درهم"]],
  ["NGN", ["naira", "ngn", "نايرا"]],
  ["USD", ["dollar", "usd", "دولار"]],
  ["EUR", ["euro", "eur", "يورو"]],
  ["GHS", ["cedi", "ghs"]],
  ["KES", ["shilling", "kes"]],
  ["XAF", ["xaf"]],
  ["DZD", ["dinar", "dzd", "دينار"]],
];

/** Turn a spoken sentence like "Vente de 10 poulets pour 50 000 francs CFA" into form values. */
export function parseTransaction(raw: string): ParsedTransaction {
  const text = raw.toLowerCase().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  let kind: ParsedTransaction["kind"] = null;
  if (has(text, ["vente", "vendu", "vend", "sold", "sale", "sell", "بيع", "بعت"])) kind = "sale";
  else if (has(text, ["achat", "acheté", "achete", "dépense", "payé", "bought", "buy", "purchase", "paid", "spent", "شراء", "اشتريت", "دفعت"])) kind = "expense";

  let category: string | null = null;
  if (has(text, ["aliment", "provende", "feed", "maïs", "علف"])) category = "feed";
  else if (has(text, ["vaccin", "médic", "medic", "vaccine", "drug", "دواء", "لقاح"])) category = "medicine";
  else if (has(text, ["poussin", "chick", "كتكوت", "صيصان"])) category = kind === "sale" ? "poultry" : "chicks";
  else if (has(text, ["œuf", "oeuf", "egg", "بيض"])) category = "eggs";
  else if (has(text, ["poulet", "volaille", "chicken", "poultry", "دجاج"])) category = kind === "expense" ? "chicks" : "poultry";
  else if (has(text, ["mangeoire", "abreuvoir", "matériel", "equipment", "معدات"])) category = "equipment";
  else if (has(text, ["salaire", "ouvrier", "labor", "wage", "أجر", "عامل"])) category = "labor";

  let currency: string | null = null;
  for (const [code, words] of CURRENCY_WORDS) {
    if (has(text, words)) {
      currency = code;
      break;
    }
  }

  // Numbers, allowing "50 000" / "50.000" / "1,5". The amount is the one after "pour/for/بـ", else the largest.
  const numbers = [...text.matchAll(/\d{1,3}(?:[ \u00a0.]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g)].map((m) => ({
    value: Number(m[0].replace(/[ \u00a0]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")),
    index: m.index ?? 0,
  }));
  let amount: number | null = null;
  const marker = text.search(/\b(pour|à|for|at)\b|ب/);
  const afterMarker = marker >= 0 ? numbers.find((n) => n.index > marker) : undefined;
  if (afterMarker) amount = afterMarker.value;
  else if (numbers.length) amount = Math.max(...numbers.map((n) => n.value));
  if (amount !== null && !Number.isFinite(amount)) amount = null;

  return { kind, category, amount, currency };
}
