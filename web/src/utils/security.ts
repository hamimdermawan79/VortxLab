/**
 * Security & Logging Sanitation Utilities for VortX Labs
 * Prevents credential leaks and information disclosure across API routes & logs.
 */

import { NextResponse } from "next/server";
import { isIP } from "net";

/**
 * Validasi URL webhook user-supplied untuk mencegah SSRF.
 * Hanya https, tolak private/loopback/link-local/metadata & hostname internal.
 */
export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) {
      return false;
    }
    const ipType = isIP(h);
    if (ipType) {
      // IPv4 private ranges + metadata endpoint
      if (
        h === "127.0.0.1" ||
        h.startsWith("0.") ||
        h.startsWith("10.") ||
        h.startsWith("169.254.") || // link-local + cloud metadata (AWS/GCP/Azure)
        h.startsWith("192.168.") ||
        h === "::1" ||
        h.startsWith("fc") || // IPv6 unique local
        h.startsWith("fd") ||
        h.startsWith("fe80") // IPv6 link-local
      ) {
        return false;
      }
      // 172.16.0.0/12
      if (h.startsWith("172.")) {
        const octet = parseInt(h.split(".")[1], 10);
        if (octet >= 16 && octet <= 31) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Mask sensitive tokens or keys (e.g. sk-vrtx-1234567890 -> sk-vrtx-1234••••7890)
 */
export function maskSecret(secret: string | null | undefined, visibleChars = 4): string {
  if (!secret) return "";
  if (secret.length <= visibleChars * 2) return "••••••••";
  const start = secret.slice(0, visibleChars);
  const end = secret.slice(-visibleChars);
  return `${start}••••${end}`;
}

/**
 * Returns a standardized, safe JSON error response for API routes.
 * Prevents leaking raw internal database errors, SQL queries, or file paths to client responses.
 */
export function safeErrorResponse(
  error: any,
  defaultMessage = "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.",
  statusCode = 500,
  errorCode = "INTERNAL_SERVER_ERROR"
): NextResponse {
  // Only log detailed stack trace on server terminal/log in non-production or for admin debugging
  if (process.env.NODE_ENV === "development") {
    console.error(`[API Error Trace]:`, error);
  } else {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API Error]: ${errorCode} - ${errMsg.slice(0, 150)}`);
  }

  // Never return raw internal exception strings containing DB credentials or schema details
  let clientMessage = defaultMessage;
  if (error && typeof error.message === "string") {
    // Whitelist specific safe business validation error messages
    const safePrefixes = [
      "Saldo", "Maksimal", "Parameter", "Hanya", "Tidak ditemukan", 
      "Akun", "Sesi", "Format", "Batas"
    ];
    if (safePrefixes.some(p => error.message.startsWith(p)) && !error.message.includes("prisma") && !error.message.includes("postgres")) {
      clientMessage = error.message;
    }
  }

  return NextResponse.json(
    {
      error: errorCode,
      message: clientMessage,
    },
    { status: statusCode }
  );
}

/**
 * Sanitize log objects by redacting passwords, auth headers, and tokens
 */
export function sanitizeLogData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeLogData);

  const sensitiveKeys = ["password", "token", "secret", "authorization", "api_key", "apikey", "vcoin_balance", "cookie"];
  const sanitized: Record<string, any> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      sanitized[k] = typeof v === "string" ? maskSecret(v) : "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      sanitized[k] = sanitizeLogData(v);
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}
