import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body.path || "/").substring(0, 150);

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    // Anonymized hash for unique visitor tracking (GDPR/Privacy friendly)
    const ipHash = crypto.createHash("sha256").update(ip + userAgent.substring(0, 50)).digest("hex").substring(0, 32);

    await prisma.visitor_logs.create({
      data: {
        ip_hash: ipHash,
        path,
        user_agent: userAgent.substring(0, 255),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false }, { status: 200 }); // Always non-blocking
  }
}
