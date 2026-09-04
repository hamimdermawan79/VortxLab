import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DESKTOP_PACKAGE_PRICES = {
  "6h": 10000,
  "12h": 20000,
  "24h": 38000,
  "7d": 250000,
  "30d": 900000,
};

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

  console.log("Seed selesai: product desktop-extractor siap dikonfigurasi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
