import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/utils/auth";
import { checkLoginAttemptRateLimit, resetLoginAttemptRateLimit } from "@/utils/rateLimiter";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit

function getClientIdentifier(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") || "";
  return { ip, ua };
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const { ip, ua } = getClientIdentifier(req);

    // Lapisan 1: rate-limit per-username (immune terhadap rotasi User-Agent & spoofing IP).
    // Cegah brute-force satu akun lewat ganti UA/IP — tidak bisa dilewati seperti lock DB.
    const rlCheck = checkLoginAttemptRateLimit(username, ip);
    if (!rlCheck.allowed) {
      return NextResponse.json(
        { error: rlCheck.error },
        { status: 429 }
      );
    }

    // Cek apakah sedang dalam status locked
    const attempt = await prisma.login_attempts.findUnique({
      where: {
        username_ip_address_user_agent: {
          username,
          ip_address: ip,
          user_agent: ua,
        },
      },
    });

    if (attempt?.locked_until && attempt.locked_until > new Date()) {
      const minutesLeft = Math.ceil((attempt.locked_until.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${minutesLeft} menit.` },
        { status: 429 }
      );
    }

    // Cek user
    const user = await prisma.profiles.findUnique({ where: { username } });
    if (!user) {
      // Tetap increment attempt bahkan kalau user tidak ada (anti-enumeration)
      await upsertFailedAttempt(username, ip, ua);
      return NextResponse.json({ error: "Username atau Password Salah" }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Akun ini terdaftar via Google. Silakan login dengan tombol 'Continue with Google'." },
        { status: 400 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await upsertFailedAttempt(username, ip, ua);
      // Cek setelah increment apakah sekarang kena lock
      const updated = await prisma.login_attempts.findUnique({
        where: {
          username_ip_address_user_agent: {
            username,
            ip_address: ip,
            user_agent: ua,
          },
        },
      });
      if (updated?.locked_until && updated.locked_until > new Date()) {
        return NextResponse.json(
          { error: "Terlalu banyak percobaan login. Akun dikunci 15 menit." },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Username atau Password Salah" }, { status: 401 });
    }

    // Login sukses → reset attempt DB & rate limiter per-username
    await prisma.login_attempts.deleteMany({
      where: { username, ip_address: ip, user_agent: ua },
    });
    resetLoginAttemptRateLimit(username);

    const token = await new SignJWT({ sub: user.id, username: user.username, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getJwtSecret());

    const response = NextResponse.json({
      message: "Logged in successfully",
      user: { id: user.id, username: user.username, role: user.role },
    });
    response.cookies.set("vortx_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function upsertFailedAttempt(username: string, ip: string, ua: string) {
  const existing = await prisma.login_attempts.findUnique({
    where: {
      username_ip_address_user_agent: {
        username,
        ip_address: ip,
        user_agent: ua,
      },
    },
  });

  const newCount = (existing?.failed_count ?? 0) + 1;
  const shouldLock = newCount >= MAX_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null;

  await prisma.login_attempts.upsert({
    where: {
      username_ip_address_user_agent: {
        username,
        ip_address: ip,
        user_agent: ua,
      },
    },
    create: {
      username,
      ip_address: ip,
      user_agent: ua,
      failed_count: newCount,
      locked_until: lockedUntil,
      last_failed_at: new Date(),
    },
    update: {
      failed_count: newCount,
      locked_until: lockedUntil,
      last_failed_at: new Date(),
    },
  });
}
