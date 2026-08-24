import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/utils/auth";
import { checkRegisterRateLimit } from "@/utils/rateLimiter";
import { Prisma } from "@prisma/client";

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  try {
    const { username, password, phone } = await req.json();
    if (!username || !password || !phone) {
      return NextResponse.json({ error: "Username, phone, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }

    // Rate-limit per-IP: cegah mass-account creation spam.
    const ip = getClientIP(req);
    const rlCheck = checkRegisterRateLimit(ip);
    if (!rlCheck.allowed) {
      return NextResponse.json({ error: rlCheck.error }, { status: 429 });
    }

    const existingUser = await prisma.profiles.findUnique({ where: { username } });
    if (existingUser) return NextResponse.json({ error: "Username Telah digunakan" }, { status: 400 });
    const hashedPassword = await bcrypt.hash(password, 10);
    // ponytail: race-first-admin dicegah via $transaction Serializable — count+create atomik.
    const newUser = await prisma.$transaction(
      async (tx) => {
        const userCount = await tx.profiles.count();
        const role = userCount === 0 ? "admin" : "user";
        return tx.profiles.create({
          data: { username, password_hash: hashedPassword, phone, role, vcoin_balance: 0 },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    const token = await new SignJWT({ sub: newUser.id, username: newUser.username, role: newUser.role })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(getJwtSecret());
    const response = NextResponse.json({ message: "Registered successfully", user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    response.cookies.set("vortx_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
