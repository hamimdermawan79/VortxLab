import { NextResponse } from 'next/server';
import { prisma } from "@/utils/prisma";
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { txId, invoiceId } = body;

    const whereClause: any = {
      user_id: user.id,
      status: 'pending',
      type: 'topup',
    };

    if (txId) {
      whereClause.id = txId;
    } else if (invoiceId) {
      whereClause.meta_data = { path: ['cashi_order_id'], equals: invoiceId };
    }

    const updated = await prisma.transactions.updateMany({
      where: whereClause,
      data: {
        status: 'cancelled',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Transaksi tertunda berhasil dibatalkan',
      count: updated.count,
    });
  } catch (err: any) {
    return safeErrorResponse(err, 'Gagal membatalkan transaksi topup.');
  }
}
