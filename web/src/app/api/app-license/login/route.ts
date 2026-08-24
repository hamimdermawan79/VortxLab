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

function genericFailure() {
  return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appId = normalizeAppId(body.app_id);
    const secret = typeof body.app_secret === "string" ? body.app_secret : "";
    const hwid = normalizeHwid(body.hwid);
    if (!validAppId(appId) || secret.length < 12 || !validHwid(hwid)) return genericFailure();

    const license = await prisma.app_licenses.findUnique({ where: { app_id: appId } });
    if (!license || license.revoked_at || license.expires_at <= new Date()) return genericFailure();

    // ponytail: timingSafeEqual anti timing-attack pada secret compare (hex sha256, panjang sama).
    const providedHash = hashValue(secret);
    const sigBuf = Buffer.from(providedHash);
    const expBuf = Buffer.from(license.secret_hash);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return genericFailure();
    }

    const hwidHash = hashValue(hwid);
    if (license.bound_hwid_hash && license.bound_hwid_hash !== hwidHash) {
      return NextResponse.json({ error: "DEVICE_MISMATCH" }, { status: 403 });
    }
    if (!license.bound_hwid_hash) {
      await prisma.app_licenses.update({ where: { id: license.id }, data: { bound_hwid_hash: hwidHash } });
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Math.min(license.expires_at.getTime(), Date.now() + APP_SESSION_DAYS * 86400000));
    await prisma.app_license_sessions.create({
      data: { license_id: license.id, token_hash: hashValue(rawToken), expires_at: expiresAt },
    });
    return NextResponse.json({ success: true, session_token: rawToken, expires_at: expiresAt });
  } catch (error) {
    console.error("App license login error:", error);
    return genericFailure();
  }
}
