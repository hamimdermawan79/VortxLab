import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { getUser } from "@/utils/auth";
import {
  APP_PRODUCT_SKU,
  makeAppId,
  makeAppSecret,
  hashValue,
  activeResetEvents,
  getActivationPackage,
  maskHwid,
} from "@/utils/appLicense";

const VRTX_ID_COST = 100;

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const licenses = await prisma.app_licenses.findMany({
    where: { user_id: user.id },
    include: { product: { select: { name: true, display_name: true, sku: true } } },
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
    })),
  });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action === "generate" ? "generate" : "activate";

    // SKU target product. Default: NewChecker (web tools). Data Extractor dapat
    // mengirim product_sku = "desktop-extractor" agar VRTXID punya akses ke app desktop.
    const requestedSku = typeof body.product_sku === "string" && body.product_sku.trim()
      ? body.product_sku.trim()
      : APP_PRODUCT_SKU;

    const product = await prisma.products.upsert({
      where: { sku: requestedSku },
      update: {},
      create: {
        sku: requestedSku,
        name: requestedSku === "desktop-extractor" ? "VortX Desktop Extractor" : "NewChecker",
        display_name: requestedSku === "desktop-extractor" ? "VortX Desktop Extractor" : "NewChecker",
        cost_per_day: 10_000,
        min_day_rent: 1,
        is_active: true,
      },
    });
    if (!product.is_active) {
      return NextResponse.json(
        { error: "PRODUCT_UNAVAILABLE", message: "Produk sedang nonaktif. Hubungi admin." },
        { status: 404 }
      );
    }

    if (action === "generate") {
      const appId = makeAppId();
      const appSecret = makeAppSecret();
      const now = new Date();
      const license = await prisma.$transaction(async (tx) => {
        const profile = await tx.profiles.findUnique({ where: { id: user.id }, select: { vcoin_balance: true } });
        if (!profile || profile.vcoin_balance < VRTX_ID_COST) throw new Error("INSUFFICIENT_BALANCE");
        const created = await tx.app_licenses.create({
          data: {
            app_id: appId,
            user_id: user.id,
            product_sku: product.sku,
            secret_hash: hashValue(appSecret),
            expires_at: now,
            download_url: process.env.NEW_CHECKER_DOWNLOAD_URL || null,
            reset_events: [],
            product_access: {
              create: { product_sku: product.sku },
            },
          } as any,
        });
        await tx.profiles.update({ where: { id: user.id }, data: { vcoin_balance: { decrement: VRTX_ID_COST } } });
        await tx.transactions.create({
          data: {
            user_id: user.id,
            type: "app_id_generation",
            amount: -VRTX_ID_COST,
            status: "completed",
            meta_data: { product_sku: product.sku, app_id: appId },
          },
        });
        return created;
      });
      return NextResponse.json({ success: true, license: { id: license.id, app_id: appId, app_secret: appSecret, expires_at: license.expires_at, cost: VRTX_ID_COST } });
    }

    const licenseId = typeof body.license_id === "string" ? body.license_id : "";
    const packageId = typeof body.package_id === "string" ? body.package_id : "";
    const activationPackage = getActivationPackage(packageId);
    if (!licenseId || !activationPackage) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + activationPackage.hours * 60 * 60 * 1000);
    const license = await prisma.$transaction(async (tx) => {
      const owned = await tx.app_licenses.findFirst({ where: { id: licenseId, user_id: user.id } });
      if (!owned) throw new Error("LICENSE_NOT_FOUND");
      if (owned.revoked_at) throw new Error("LICENSE_REVOKED");
      if (owned.expires_at > now) throw new Error("ALREADY_ACTIVE");
      const profile = await tx.profiles.findUnique({ where: { id: user.id }, select: { vcoin_balance: true } });
      if (!profile || profile.vcoin_balance < activationPackage.cost) throw new Error("INSUFFICIENT_BALANCE");
      const updated = await tx.app_licenses.update({ where: { id: owned.id }, data: { expires_at: expiresAt, download_url: process.env.NEW_CHECKER_DOWNLOAD_URL || owned.download_url } });
      await tx.profiles.update({ where: { id: user.id }, data: { vcoin_balance: { decrement: activationPackage.cost } } });
      await tx.transactions.create({
        data: {
          user_id: user.id,
          type: "app_subscription",
          amount: -activationPackage.cost,
          status: "completed",
          meta_data: { product_sku: product.sku, package_id: packageId, duration_hours: activationPackage.hours, app_id: owned.app_id },
        },
      });
      return updated;
    });
    return NextResponse.json({ success: true, license: { id: license.id, app_id: license.app_id, expires_at: license.expires_at, cost: activationPackage.cost } });
  } catch (error: any) {
    const messages: Record<string, string> = {
      INSUFFICIENT_BALANCE: "Saldo token tidak mencukupi.",
      LICENSE_NOT_FOUND: "VRTXID tidak ditemukan.",
      LICENSE_REVOKED: "VRTXID sudah dicabut.",
      ALREADY_ACTIVE: "VRTXID sudah aktif.",
    };
    if (messages[error?.message]) return NextResponse.json({ error: error.message, message: messages[error.message] }, { status: error.message === "INSUFFICIENT_BALANCE" ? 402 : 400 });
    console.error("App license purchase error:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Server gagal memproses VRTXID." }, { status: 500 });
  }
}
