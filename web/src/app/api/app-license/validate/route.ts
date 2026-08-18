import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { hashValue, normalizeHwid, validHwid } from "@/utils/appLicense";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body.session_token === "string" ? body.session_token : "";
    const hwid = normalizeHwid(body.hwid);
    if (token.length < 20 || !validHwid(hwid)) return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
    const session = await prisma.app_license_sessions.findUnique({
      where: { token_hash: hashValue(token) },
      include: { license: true },
    });
    if (!session || session.expires_at <= new Date() || session.license.revoked_at || session.license.expires_at <= new Date()) {
      return NextResponse.json({ error: "LICENSE_EXPIRED" }, { status: 401 });
    }
    if (session.license.bound_hwid_hash !== hashValue(hwid)) {
      return NextResponse.json({ error: "DEVICE_MISMATCH" }, { status: 403 });
    }
    return NextResponse.json({ valid: true, expires_at: session.license.expires_at });
  } catch (error) {
    console.error("App license validate error:", error);
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
  }
}
