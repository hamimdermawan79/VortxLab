import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const licenseId = new URL(req.url).searchParams.get("license_id");
  const license = licenseId
    ? await prisma.app_licenses.findFirst({ where: { id: licenseId, user_id: user.id } })
    : await prisma.app_licenses.findFirst({
        where: { user_id: user.id, product_sku: "new-checker", revoked_at: null, expires_at: { gt: new Date() } },
        orderBy: { expires_at: "desc" },
      });
  if (!license) return NextResponse.json({ error: "LICENSE_NOT_FOUND" }, { status: 404 });
  if (license.revoked_at || license.expires_at <= new Date()) return NextResponse.json({ error: "LICENSE_INACTIVE" }, { status: 403 });

  const downloadUrl = license.download_url || process.env.NEW_CHECKER_DOWNLOAD_URL;
  if (!downloadUrl) return NextResponse.json({ error: "DOWNLOAD_NOT_CONFIGURED" }, { status: 404 });
  return NextResponse.redirect(downloadUrl);
}
