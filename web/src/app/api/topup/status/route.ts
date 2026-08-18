import { NextResponse } from 'next/server';
import { prisma } from "@/utils/prisma";
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const invoice_id = searchParams.get('invoice_id');
    if (!invoice_id) return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });

    let tx = await prisma.transactions.findFirst({
      where: {
        user_id: user.id,
        meta_data: { path: ['cashi_order_id'], equals: invoice_id }
      }
    });
    
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Jika transaksi masih pending di database lokal, cek status ke Cashi API atau batas waktu 15 menit
    if (tx.status === 'pending') {
      const isPastTimeout = Date.now() - new Date(tx.created_at).getTime() > 15 * 60 * 1000;
      
      const cashiApiKey = process.env.CASHI_API_KEY;
      if (cashiApiKey) {
        try {
          const cashiRes = await fetch(`https://cashi.id/api/order-status/${invoice_id}`, {
            headers: { 'x-api-key': cashiApiKey },
            cache: 'no-store'
          });
          if (cashiRes.ok) {
            const cashiData = await cashiRes.json();
            const rawStatus = (cashiData.status || cashiData.data?.status || '').toUpperCase();
            if (rawStatus === 'SETTLED' || rawStatus === 'PAID' || rawStatus === 'SUCCESS') {
              const updatedTx = await prisma.$transaction(async (prismaTx) => {
                const existing = await prismaTx.transactions.findUnique({ where: { id: tx!.id } });
                if (!existing || existing.status === 'completed') return existing;

                const completed = await prismaTx.transactions.update({
                  where: { id: tx!.id },
                  data: { status: 'completed' }
                });

                await prismaTx.profiles.update({
                  where: { id: tx!.user_id },
                  data: { vcoin_balance: { increment: tx!.amount } }
                });

                return completed;
              });
              if (updatedTx) {
                tx = updatedTx;
              }
            } else if (rawStatus === 'EXPIRED' || rawStatus === 'FAILED' || rawStatus === 'CANCELLED' || isPastTimeout) {
              tx = await prisma.transactions.update({
                where: { id: tx.id },
                data: { status: 'expired' }
              });
            }
          } else if (isPastTimeout) {
            tx = await prisma.transactions.update({
              where: { id: tx.id },
              data: { status: 'expired' }
            });
          }
        } catch (pollErr) {
          console.warn('[Topup Status Polling Warning]:', pollErr);
          if (isPastTimeout) {
            tx = await prisma.transactions.update({
              where: { id: tx.id },
              data: { status: 'expired' }
            });
          }
        }
      } else if (isPastTimeout) {
        tx = await prisma.transactions.update({
          where: { id: tx.id },
          data: { status: 'expired' }
        });
      }
    }

    return NextResponse.json({ status: tx.status });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal memeriksa status transaksi.");
  }
}
