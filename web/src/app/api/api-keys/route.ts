import { NextRequest, NextResponse } from "next/server";
import { getUser, hashApiKey } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import { safeErrorResponse, maskSecret } from "@/utils/security";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateApiKey(): string {
  const random = crypto.randomBytes(24).toString("hex");
  return `sk-vrtx-${random}`;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const allKeys = await prisma.api_keys.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
    });

    let currentKey = allKeys[0] || null;

    // Clean up any legacy duplicates in database (keep only latest)
    if (allKeys.length > 1) {
      const staleIds = allKeys.slice(1).map((k) => k.id);
      await prisma.api_keys.deleteMany({ where: { id: { in: staleIds } } });
    }

    // If user has no API key, generate exactly 1 default key (hash-only)
    if (!currentKey) {
      const rawKey = generateApiKey();
      currentKey = await prisma.api_keys.create({
        data: {
          user_id: user.id,
          name: "Production API Key",
          key_hash: hashApiKey(rawKey),
        },
      });
      return NextResponse.json({
        key: {
          id: currentKey.id,
          name: currentKey.name,
          key: rawKey,
          isLegacy: false,
          isActive: currentKey.is_active,
          createdAt: currentKey.created_at,
          lastUsed: currentKey.last_used,
        },
      });
    }

    // Key lama (plaintext di kolom key) tampilkan full. Key baru (hash) tampilkan masked.
    const isLegacy = !currentKey.key_hash;
    return NextResponse.json({
      key: {
        id: currentKey.id,
        name: currentKey.name,
        key: isLegacy ? currentKey.key : maskSecret(currentKey.key_hash || "", 6),
        isLegacy,
        isActive: currentKey.is_active,
        createdAt: currentKey.created_at,
        lastUsed: currentKey.last_used,
      },
    });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal memuat API Key.");
  }
}

// Re-generate API Key (Wipes old key from database completely)
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    // 1. Delete all previous keys for this user completely from database (zero clutter)
    await prisma.api_keys.deleteMany({
      where: { user_id: user.id },
    });

    // 2. Create brand new fresh key — simpan HASH saja, bukan plaintext (anti DB leak).
    const rawKey = generateApiKey();
    const newKey = await prisma.api_keys.create({
      data: {
        user_id: user.id,
        name: "Production API Key",
        key_hash: hashApiKey(rawKey),
      },
    });

    return NextResponse.json({
      success: true,
      message: "API Key lama telah dicabut dan key baru berhasil digenerate.",
      key: {
        id: newKey.id,
        name: newKey.name,
        key: rawKey,
        isLegacy: false,
        isActive: newKey.is_active,
        createdAt: newKey.created_at,
      },
    });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal meregenerasi API Key.");
  }
}
