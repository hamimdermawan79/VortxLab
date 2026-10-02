import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import {
  hashValue,
  normalizeAppId,
  normalizeHwid,
  validAppId,
  validHwid,
  APP_SESSION_DAYS,
} from "@/utils/appLicense";
import crypto from "crypto";
import { DESKTOP_EXTRACTOR_SKU } from "@/constants/sku";

export const dynamic = "force-dynamic";

function fail(message: string, code: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

// Login berbasis VRTXID + HWID saja (tanpa AppSecret).
// - Jika bound_hwid ksong -> bind (first login dari device ini).
// - Jika sudah bound ke HWID lain -> DEVICE_MISMATCH, harus reset dari dashboard.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appId = normalizeAppId(body.app_id);
    const hwid = normalizeHwid(body.hwid);

    if (!validAppId(appId) || !validHwid(hwid)) {
      return fail("VRTXID atau HWID tidak valid.", "INVALID_CREDENTIALS", 401);
    }

    const license = await prisma.app_licenses.findUnique({
      where: { app_id: appId },
      include: { product_access: true },
    });
    if (!license || license.revoked_at || license.expires_at <= new Date()) {
      return fail("VRTXID tidak ditemukan atau tidak aktif.", "INVALID_CREDENTIALS", 401);
    }

    // Multi-product check
    const mainSku = license.product_sku;
    const hasAccess =
      mainSku === DESKTOP_EXTRACTOR_SKU ||
      license.product_access.some((p) => p.product_sku === DESKTOP_EXTRACTOR_SKU);
    if (!hasAccess) {
      return fail("VRTXID ini tidak memiliki akses ke Data Extractor.", "PRODUCT_ACCESS_DENIED", 403);
    }

    const hwidHash = hashValue(hwid);

    // Bind device jika belum terikat
    if (!license.bound_hwid_hash) {
      await prisma.app_licenses.update({
        where: { id: license.id },
        data: { bound_hwid_hash: hwidHash },
      });
    } else if (license.bound_hwid_hash !== hwidHash) {
      return fail(
        "VRTXID terikat ke perangkat lain. Reset device dari dashboard.",
        "DEVICE_MISMATCH",
        403
      );
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Math.min(license.expires_at.getTime(), Date.now() + APP_SESSION_DAYS * 86400000)
    );
    await prisma.app_license_sessions.create({
      data: { license_id: license.id, token_hash: hashValue(rawToken), expires_at: expiresAt },
    });

    return NextResponse.json({
      success: true,
      session_token: rawToken,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Desktop license login error:", error);
    return fail("Terjadi kesalahan server.", "SERVER_ERROR", 500);
  }
}
