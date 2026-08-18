import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Clean up any legacy inactive service configurations from the database
    await prisma.service_configs.deleteMany({
      where: {
        service_type: {
          in: ['cek-level', 'cek-topup', 'cek-vip', 'cek-type', 'farm-level', 'farm-vip', 'extractor']
        }
      }
    });

    const defaultServices = [
      { service_type: 'sortir-banned', cost_per_id: 20 },
      { service_type: 'sortir-banned-api', cost_per_id: 20 },
      { service_type: 'data-extractor', cost_per_id: 5 },
      { service_type: 'intip-nomor', cost_per_id: 2500 },
      { service_type: 'cek-info-akun', cost_per_id: 100 },
    ];

    for (const def of defaultServices) {
      const exists = await prisma.service_configs.findUnique({
        where: { service_type: def.service_type },
      });
      if (!exists) {
        await prisma.service_configs.create({ data: def });
      }
    }

    return NextResponse.json(await prisma.service_configs.findMany({ orderBy: { service_type: 'asc' } }));
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memuat konfigurasi harga layanan.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { service_type, cost_per_id } = await req.json();
    if (!service_type || cost_per_id === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const updated = await prisma.service_configs.upsert({
      where: { service_type },
      update: { cost_per_id: Math.max(0, parseInt(cost_per_id, 10)) },
      create: { service_type, cost_per_id: Math.max(0, parseInt(cost_per_id, 10)) },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memperbarui harga layanan.');
  }
}