export interface ExtractionResult {
  preview: string;
  fullContent: string;
  filename: string;
  count: number;
}

export async function processMacExtractor(file: File): Promise<ExtractionResult> {
  const content = await file.text();
  const macRegex = /local_mac_addr\s*=\s*([A-Fa-f0-9:]+)/g;
  const passwordRegex = /hw_account_password_\d+\s*=\s*([A-Fa-f0-9]+)/g;
  const idRegex = /hw_account_id_\d+\s*=\s*(\d+)/g;
  const fallbackIdRegex = /\b\d{6,9}\b/g;
  const macs = Array.from(content.matchAll(macRegex)).map(m => m[1]);
  const passwords = Array.from(content.matchAll(passwordRegex)).map(m => m[1]);
  const accountIds = Array.from(content.matchAll(idRegex)).map(m => m[1]);
  if (accountIds.length === 0) { const fallbackIds = Array.from(content.matchAll(fallbackIdRegex)).map(m => m[0]); accountIds.push(...fallbackIds); }
  const uniqueMacs = [...new Set(macs)]; const uniquePWs = [...new Set(passwords)]; const uniqueIDs = [...new Set(accountIds)];
  if (uniqueIDs.length === 0 || uniquePWs.length === 0 || uniqueMacs.length === 0) throw new Error("Data tidak valid: MAC, Password, atau ID tidak ditemukan.");
  const results: string[] = [];
  uniqueIDs.forEach(id => { uniquePWs.forEach(pw => { uniqueMacs.forEach(mac => { results.push(`ID: ${id} PW: ${pw} MAC: ${mac}`); }); }); });
  const fullContent = results.join('\n');
  return { preview: results.slice(0, 15).join('\n') + (results.length > 15 ? '\n...' : ''), fullContent, filename: `extracted_${file.name.split('.')[0]}.txt`, count: results.length };
}

export async function processXmlToConf(file: File): Promise<ExtractionResult> {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const map = xmlDoc.getElementsByTagName("map")[0];
  if (!map) throw new Error("Format XML tidak valid (Root <map> tidak ditemukan)");
  const lines: string[] = ["[LOCAL_DATA_INFO]"];
  Array.from(map.children).forEach((elem) => { const key = elem.getAttribute("name"); if (!key) return; let value = ""; if (elem.tagName === "int" || elem.tagName === "boolean") { value = elem.getAttribute("value") || ""; } else if (elem.tagName === "string") { value = elem.textContent || ""; } if (value) lines.push(`${key} = ${value}`); });
  const fullContent = lines.join('\n');
  return { preview: lines.slice(0, 15).join('\n') + (lines.length > 15 ? '\n...' : ''), fullContent, filename: `${file.name.split('.')[0]}.conf`, count: lines.length - 1 };
}

export async function processNoMacExtractor(file: File): Promise<ExtractionResult> {
  const content = await file.text();
  const idRegex = /\b\d{6,10}\b/g;
  const pwRegex = /\bAF1[0-9A-F]+\b/g;
  const ids = [...new Set(Array.from(content.matchAll(idRegex)).map(m => m[0]))];
  const pws = [...new Set(Array.from(content.matchAll(pwRegex)).map(m => m[0]))];
  if (ids.length === 0 || pws.length === 0) throw new Error("ID atau Password (AF1...) tidak ditemukan.");
  const generateRandomMac = () => Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':');
  const results: string[] = [];
  ids.forEach(id => { pws.forEach(pw => { results.push(`ID: ${id} PW: ${pw} MAC: ${generateRandomMac()}`); }); });
  const fullContent = results.join('\n');
  return { preview: results.slice(0, 15).join('\n') + (results.length > 15 ? '\n...' : ''), fullContent, filename: `nomac_${file.name.split('.')[0]}.txt`, count: results.length };
}

export async function processMacNoMacSplitter(file: File): Promise<{ hasMac: boolean }> {
  const content = await file.text();
  const macRegex = /local_mac_addr\s*=\s*([A-Fa-f0-9:]+)/;
  return { hasMac: macRegex.test(content) };
}
