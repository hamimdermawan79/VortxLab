import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const products = await prisma.products.findMany({ orderBy: { sku: 'asc' } });
    const licenses = await prisma.licenses.findMany({
      include: { profile: { select: { username: true } }, product: { select: { name: true, display_name: true, sku: true } } },
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json({ products, licenses });
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memuat produk.');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sku, updates } = await req.json();
    if (!sku || !updates) return NextResponse.json({ error: 'Missing sku or updates' }, { status: 400 });
    await prisma.products.update({ where: { sku }, data: updates });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memperbarui produk.');
  }
}
