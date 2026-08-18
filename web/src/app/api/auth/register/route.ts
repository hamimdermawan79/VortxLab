import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/utils/auth";

export async function POST(req: Request) {
  try {
    const { username, password, phone } = await req.json();
    if (!username || !password || !phone) {
      return NextResponse.json({ error: "Username, phone, and password are required" }, { status: 400 });
    }
    const existingUser = await prisma.profiles.findUnique({ where: { username } });
    if (existingUser) return NextResponse.json({ error: "Username Telah digunakan" }, { status: 400 });
    const userCount = await prisma.profiles.count();
    const role = userCount === 0 ? "admin" : "user";
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.profiles.create({
      data: { username, password_hash: hashedPassword, phone, role, vcoin_balance: 0 },
    });
    const token = await new SignJWT({ sub: newUser.id, username: newUser.username, role: newUser.role })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(getJwtSecret());
    const response = NextResponse.json({ message: "Registered successfully", user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    response.cookies.set("vortx_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7, path: "/" });
    return response;
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
