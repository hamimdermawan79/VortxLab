import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DESKTOP_PACKAGE_PRICES = {
  "6h": 10000,
  "12h": 20000,
  "24h": 38000,
  "7d": 250000,
  "30d": 900000,
};

// Konfigurasi biaya layanan per-ID. Disimpan di service_configs dan
// bisa disesuaikan kapan saja via Admin Panel (PricingModal).
const SERVICE_CONFIG_DEFAULTS = [
  { service_type: "sortir-banned", cost_per_id: 20 },
  { service_type: "sortir-banned-api", cost_per_id: 20 },
  { service_type: "sortir-family", cost_per_id: 25 },
  { service_type: "sortir-polos", cost_per_id: 50 },
  { service_type: "data-extractor", cost_per_id: 5 },
  { service_type: "intip-nomor", cost_per_id: 2500 },
  { service_type: "cek-info-akun", cost_per_id: 100 },
];

async function main() {
  // Seed / ensure Desktop Extractor product so admin can configure prices
  // and download URL before any user generates a VRTXID.
  await prisma.products.upsert({
    where: { sku: "desktop-extractor" },
    update: {
      is_active: true,
    },
    create: {
      sku: "desktop-extractor",
      name: "VortX Desktop Extractor",
      display_name: "VortX Desktop Extractor",
      cost_per_day: 10000,
      min_day_rent: 1,
      is_active: true,
      package_prices: DESKTOP_PACKAGE_PRICES,
      download_url: null,
    },
  });

  // Ensure all service pricing rows exist (markup default sudah termasuk).
  for (const def of SERVICE_CONFIG_DEFAULTS) {
    await prisma.service_configs.upsert({
      where: { service_type: def.service_type },
      update: {},
      create: def,
    });
  }

  console.log("Seed selesai: desktop-extractor & service configs siap dikonfigurasi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
