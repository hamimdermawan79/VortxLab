import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getUser } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Header Authorization Bearer token tidak valid atau tidak ditemukan." },
        { status: 401 }
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        vcoin_balance: true,
        role: true,
        created_at: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "USER_NOT_FOUND", message: "Profil tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      user_id: profile.id,
      username: profile.username,
      token_balance: profile.vcoin_balance,
      role: profile.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}
