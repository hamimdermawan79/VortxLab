import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getUser } from "@/utils/auth";
import { activeResetEvents, maskHwid, getActivationPackage } from "@/utils/appLicense";

export const dynamic = "force-dynamic";

const DESKTOP_SKU = "desktop-extractor";

// GET /api/desktop-license
// Mengembalikan VRTXID milik user beserta akses product (untuk tab Data Extractor).
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const licenses = await prisma.app_licenses.findMany({
    where: { user_id: user.id },
    include: { product: { select: { name: true, display_name: true, sku: true } }, product_access: true },
    orderBy: { created_at: "desc" },
  });

  const now = Date.now();
  return NextResponse.json({
    licenses: licenses.map((license) => ({
      id: license.id,
      app_id: license.app_id,
      product_sku: license.product_sku,
      product_name: license.product?.display_name || license.product?.name || license.product_sku,
      expires_at: license.expires_at,
      revoked_at: license.revoked_at,
      activated: license.expires_at > new Date(),
      bound: Boolean(license.bound_hwid_hash),
      hwid: maskHwid(license.bound_hwid_hash),
      reset_count: activeResetEvents(license.reset_events, now).length,
      reset_limit: 3,
      reset_window_days: 7,
      download_url: license.download_url,
      has_desktop_access:
        license.product_sku === DESKTOP_SKU ||
        license.product_access.some((p) => p.product_sku === DESKTOP_SKU),
    })),
  });
}

// POST /api/desktop-license
// - action "grant": tambahkan akses desktop-extractor ke VRTXID yang sudah ada (cross-product).
// - action "activate": perpanjang VRTXID untuk product desktop-extractor.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action === "grant" ? "grant" : "activate";
    const licenseId = typeof body.license_id === "string" ? body.license_id : "";
    const packageId = typeof body.package_id === "string" ? body.package_id : "";

    if (!licenseId) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    if (action === "grant") {
      const license = await prisma.app_licenses.findFirst({ where: { id: licenseId, user_id: user.id } });
      if (!license) return NextResponse.json({ error: "LICENSE_NOT_FOUND" }, { status: 404 });
      if (license.revoked_at) return NextResponse.json({ error: "LICENSE_REVOKED" }, { status: 400 });

      await prisma.app_license_product_access.upsert({
        where: { license_id_product_sku: { license_id: license.id, product_sku: DESKTOP_SKU } },
        update: {},
        create: { license_id: license.id, product_sku: DESKTOP_SKU },
      });
      return NextResponse.json({ success: true, message: "Akses Data Extractor ditambahkan ke VRTXID." });
    }

    // activate
    const activationPackage = getActivationPackage(packageId);
    if (!activationPackage) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const license = await prisma.app_licenses.findFirst({
      where: { id: licenseId, user_id: user.id },
      include: { product_access: true },
    });
    if (!license) return NextResponse.json({ error: "LICENSE_NOT_FOUND" }, { status: 404 });
    if (license.revoked_at) return NextResponse.json({ error: "LICENSE_REVOKED" }, { status: 400 });
    const now = new Date();
    if (license.expires_at > now) {
      return NextResponse.json({ error: "ALREADY_ACTIVE", message: "VRTXID sudah aktif." }, { status: 400 });
    }

    // Pastikan license punya akses desktop-extractor
    const hasDesktop =
      license.product_sku === DESKTOP_SKU ||
      license.product_access.some((p) => p.product_sku === DESKTOP_SKU);
    if (!hasDesktop) {
      // auto-grant saat aktivasi dari tab Data Extractor
      await prisma.app_license_product_access.upsert({
        where: { license_id_product_sku: { license_id: license.id, product_sku: DESKTOP_SKU } },
        update: {},
        create: { license_id: license.id, product_sku: DESKTOP_SKU },
      });
    }

    const expiresAt = new Date(now.getTime() + activationPackage.hours * 60 * 60 * 1000);
    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.profiles.findUnique({ where: { id: user.id }, select: { vcoin_balance: true } });
      if (!profile || profile.vcoin_balance < activationPackage.cost) throw new Error("INSUFFICIENT_BALANCE");
      const up = await tx.app_licenses.update({ where: { id: license.id }, data: { expires_at: expiresAt } });
      await tx.profiles.update({ where: { id: user.id }, data: { vcoin_balance: { decrement: activationPackage.cost } } });
      await tx.transactions.create({
        data: {
          user_id: user.id,
          type: "app_subscription",
          amount: -activationPackage.cost,
          status: "completed",
          meta_data: { product_sku: DESKTOP_SKU, package_id: packageId, duration_hours: activationPackage.hours, app_id: license.app_id },
        },
      });
      return up;
    });

    return NextResponse.json({ success: true, license: { id: updated.id, app_id: updated.app_id, expires_at: updated.expires_at, cost: activationPackage.cost } });
  } catch (error: any) {
    const messages: Record<string, string> = {
      INSUFFICIENT_BALANCE: "Saldo token tidak mencukupi.",
      LICENSE_NOT_FOUND: "VRTXID tidak ditemukan.",
      LICENSE_REVOKED: "VRTXID sudah dicabut.",
      ALREADY_ACTIVE: "VRTXID sudah aktif.",
    };
    if (messages[error?.message]) {
      return NextResponse.json({ error: error.message, message: messages[error.message] }, { status: error.message === "INSUFFICIENT_BALANCE" ? 402 : 400 });
    }
    console.error("Desktop license purchase error:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Server gagal memproses permintaan." }, { status: 500 });
  }
}
