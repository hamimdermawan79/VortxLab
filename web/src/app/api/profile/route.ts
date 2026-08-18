import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getUser } from "@/utils/auth";
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, phone: true, role: true, vcoin_balance: true }
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
