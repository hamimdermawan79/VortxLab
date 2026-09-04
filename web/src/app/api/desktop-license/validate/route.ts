import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { hashValue, normalizeHwid, validHwid } from "@/utils/appLicense";
import { DESKTOP_EXTRACTOR_SKU } from "../login/route";

function denied(message: string, code: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body.session_token === "string" ? body.session_token.trim() : "";
    const hwid = normalizeHwid(body.hwid);

    if (token.length < 20 || !validHwid(hwid)) {
      return denied("Session atau HWID tidak valid.", "INVALID_INPUT", 400);
    }

    const session = await prisma.app_license_sessions.findUnique({
      where: { token_hash: hashValue(token) },
      include: { license: { include: { product_access: true } } },
    });

    if (!session) {
      return denied("Session tidak valid.", "INVALID_SESSION", 401);
    }

    const license = session.license;
    if (session.expires_at <= new Date() || license.revoked_at || license.expires_at <= new Date()) {
      return denied("License sudah kedaluwarsa.", "LICENSE_EXPIRED", 401);
    }

    // Multi-product check — SKU harus diizinkan untuk VRTXID ini
    const mainSku = license.product_sku;
    const hasAccess =
      mainSku === DESKTOP_EXTRACTOR_SKU ||
      license.product_access.some((p) => p.product_sku === DESKTOP_EXTRACTOR_SKU);
    if (!hasAccess) {
      return denied("VRTXID ini tidak memiliki akses ke Data Extractor.", "PRODUCT_ACCESS_DENIED", 403);
    }

    const hwidHash = hashValue(hwid);
    if (!license.bound_hwid_hash || license.bound_hwid_hash !== hwidHash) {
      return denied("Perangkat tidak cocok.", "DEVICE_MISMATCH", 403);
    }

    return NextResponse.json({
      valid: true,
      expires_at: license.expires_at,
    });
  } catch (error) {
    console.error("Desktop license validate error:", error);
    return denied("Terjadi kesalahan server.", "SERVER_ERROR", 500);
  }
}
