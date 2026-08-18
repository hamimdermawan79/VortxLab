import { NextResponse } from 'next/server';
import { prisma } from "@/utils/prisma";
import { getUser } from "@/utils/auth";
import { safeErrorResponse } from "@/utils/security";

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const invoice_id = searchParams.get('invoice_id');
    if (!invoice_id) {
      return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
    }

    const tx = await prisma.transactions.findFirst({
      where: {
        user_id: user.id,
        meta_data: { path: ['cashi_order_id'], equals: invoice_id }
      }
    });

    if (!tx) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const meta = (tx.meta_data || {}) as any;

    return NextResponse.json({
      amount: tx.amount,
      status: tx.status,
      invoice_id,
      qris_url: meta.qris_url || null,
      payment_url: meta.payment_url || null,
      created_at: tx.created_at,
    });
  } catch (err: any) {
    return safeErrorResponse(err, 'Gagal memuat status pembayaran invoice.');
  }
}
