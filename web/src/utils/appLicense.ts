import crypto from "crypto";

export const APP_PRODUCT_SKU = "new-checker";
export const APP_SESSION_DAYS = 1;
export const RESET_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const ACTIVATION_PACKAGES = {
  "6h": { label: "6 Jam", hours: 6, cost: 10_000 },
  "12h": { label: "12 Jam", hours: 12, cost: 20_000 },
  "24h": { label: "24 Jam", hours: 24, cost: 38_000, offer: "Hemat 5%" },
  "7d": { label: "7 Hari", hours: 7 * 24, cost: 250_000, offer: "Hemat 10%" },
  "30d": { label: "30 Hari", hours: 30 * 24, cost: 900_000, offer: "Hemat 25% • Best value" },
} as const;

export type ActivationPackageId = keyof typeof ACTIVATION_PACKAGES;

export function getActivationPackage(value: unknown) {
  return typeof value === "string" && value in ACTIVATION_PACKAGES
    ? ACTIVATION_PACKAGES[value as ActivationPackageId]
    : null;
}

export function maskHwid(value: string | null): string {
  if (!value) return "Belum bind";
  return `${value.slice(0, 6)}••••${value.slice(-6)}`;
}
export const MAX_RESETS = 3;

export function normalizeAppId(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function normalizeHwid(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function makeAppId(): string {
  return `VRTX${crypto.randomBytes(7).toString("base64url").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10)}`;
}

export function makeAppSecret(): string {
  return crypto.randomBytes(18).toString("base64url");
}

export function validHwid(hwid: string): boolean {
  return /^[a-z0-9._:-]{8,256}$/i.test(hwid);
}

export function validAppId(appId: string): boolean {
  return /^VRTX[A-Z0-9]{8,24}$/.test(appId);
}

export function resetEvents(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

export function activeResetEvents(value: unknown, now = Date.now()): number[] {
  return resetEvents(value).filter((timestamp) => now - timestamp < RESET_WINDOW_MS);
}
