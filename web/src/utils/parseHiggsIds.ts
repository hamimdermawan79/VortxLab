// Ekstraksi ID akun Higgs yang aman dari teks mentah (paste dari manapun).
// Aman terhadap MAC / token campuran: hanya run angka 5-12 digit pada word boundary
// yang diambil, sehingga "72:DD:A8:5D:48:4C" TIDAK menghasilkan ID phantom.
// Mendukung multi-ID per baris dan bentuk berlabel "ID: 12345678" / "uid=87654321".
export function parseHiggsIds(rawText: string): string[] {
  if (!rawText || typeof rawText !== "string") return [];

  const out: string[] = [];

  // 1. ID berlabel eksplisit: "ID: 12345678", "user_id=87654321", "uid 12345678"
  const labeledRe = /\b(?:id|user_?id|uid)\s*[:=]\s*(\d{5,12})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = labeledRe.exec(rawText)) !== null) {
    out.push(m[1]);
  }

  // 2. Run angka telanjang 5-12 digit pada word boundary (MAC-safe)
  const bareRe = /\b\d{5,12}\b/g;
  while ((m = bareRe.exec(rawText)) !== null) {
    out.push(m[0]);
  }

  return Array.from(new Set(out));
}