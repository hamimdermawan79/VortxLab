import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { hashValue, normalizeHwid, validHwid } from "@/utils/appLicense";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_TEXT_OUTPUT_BYTES = 50 * 1024 * 1024; // 50 MB
const DESKTOP_EXTRACTOR_SKU = "desktop-extractor";

function deny(message: string, code: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = typeof body.session_token === "string" ? body.session_token.trim() : "";
    const hwid = normalizeHwid(body.hwid);
    const textOutput = typeof body.text_output === "string" ? body.text_output : "";
    const rawFolder = typeof body.folder_name === "string" ? body.folder_name : "";

    if (token.length < 20 || !validHwid(hwid)) {
      return deny("Session atau HWID tidak valid.", "INVALID_INPUT", 400);
    }
    if (!textOutput) {
      return deny("text_output kosong.", "EMPTY_OUTPUT", 400);
    }
    if (Buffer.byteLength(textOutput, "utf-8") > MAX_TEXT_OUTPUT_BYTES) {
      return deny("Hasil terlalu besar. Pecah menjadi beberapa batch.", "PAYLOAD_TOO_LARGE", 413);
    }

    const session = await prisma.app_license_sessions.findUnique({
      where: { token_hash: hashValue(token) },
      include: { license: { include: { product_access: true } } },
    });

    const license = session?.license;
    if (!session || !license || session.expires_at <= new Date() || license.revoked_at || license.expires_at <= new Date()) {
      return deny("Session tidak valid atau kedaluwarsa.", "INVALID_SESSION", 401);
    }

    const mainSku = license.product_sku;
    const hasAccess =
      mainSku === DESKTOP_EXTRACTOR_SKU ||
      license.product_access.some((p) => p.product_sku === DESKTOP_EXTRACTOR_SKU);
    if (!hasAccess) {
      return deny("Tidak memiliki akses ke Data Extractor.", "PRODUCT_ACCESS_DENIED", 403);
    }

    const hwidHash = hashValue(hwid);
    if (!license.bound_hwid_hash || license.bound_hwid_hash !== hwidHash) {
      return deny("Perangkat tidak cocok.", "DEVICE_MISMATCH", 403);
    }

    // Save to private/uploads/desktop/{userId}/
    const sanitizedFolder = rawFolder.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
    const timestamp = Date.now();
    const safeFolder = sanitizedFolder || "output";
    const filename = `${timestamp}_${safeFolder}.txt`;
    const dir = path.join(process.cwd(), "private", "uploads", "desktop", license.user_id);

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), textOutput, "utf-8");

    return NextResponse.json({
      success: true,
      filename,
      saved_to: `desktop/${license.user_id}/${filename}`,
      message: "Hasil ekstraksi berhasil disimpan.",
    });
  } catch (error) {
    console.error("Desktop extractor receiver error:", error);
    return deny("Terjadi kesalahan server.", "SERVER_ERROR", 500);
  }
}
