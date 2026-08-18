import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configs = await prisma.service_configs.findMany({ orderBy: { service_type: 'asc' } });
    const map: Record<string, number> = {};
    configs.forEach(c => { map[c.service_type] = c.cost_per_id; });
    return NextResponse.json(map);
  } catch {
    const defaults: Record<string, number> = {
      'sortir-banned': 20,
      'sortir-banned-api': 20,
      'data-extractor': 5,
      'intip-nomor': 2500,
      'cek-info-akun': 100,
    };
    return NextResponse.json(defaults);
  }
}