import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getUser } from "@/utils/auth";
import { activeResetEvents, hashValue, normalizeHwid, validHwid, MAX_RESETS } from "@/utils/appLicense";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await req.json();
    const licenseId = typeof body.license_id === "string" ? body.license_id : "";
    const newHwid = normalizeHwid(body.hwid);
    if (!licenseId || !validHwid(newHwid)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const license = await tx.app_licenses.findFirst({ where: { id: licenseId, user_id: user.id } });
      if (!license || license.revoked_at || license.expires_at <= new Date()) throw new Error("LICENSE_NOT_FOUND");
      const now = Date.now();
      const events = activeResetEvents(license.reset_events, now);
      if (events.length >= MAX_RESETS) throw new Error("RESET_LIMIT");
      const newHwidHash = hashValue(newHwid);
      await tx.app_licenses.update({
        where: { id: license.id },
        data: { bound_hwid_hash: newHwidHash, reset_events: [...events, now] },
      });
      await tx.app_license_reset_events.create({ data: { license_id: license.id, old_hwid_hash: license.bound_hwid_hash, new_hwid_hash: newHwidHash } });
      return { reset_count: events.length + 1 };
    });
    return NextResponse.json({ success: true, ...result, reset_limit: MAX_RESETS });
  } catch (error: any) {
    if (error?.message === "RESET_LIMIT") return NextResponse.json({ error: "RESET_LIMIT", reset_limit: MAX_RESETS }, { status: 429 });
    if (error?.message === "LICENSE_NOT_FOUND") return NextResponse.json({ error: "LICENSE_NOT_FOUND" }, { status: 404 });
    console.error("App license reset error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
