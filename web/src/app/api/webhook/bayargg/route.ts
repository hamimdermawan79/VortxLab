import { NextResponse } from 'next/server'
import { prisma } from "@/utils/prisma";
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const signature = req.headers.get('X-Webhook-Signature') || req.headers.get('x-webhook-signature') || '';
    const secret = process.env.BAYARGG_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook Error: BAYARGG_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const headerTimestamp = req.headers.get('X-Webhook-Timestamp') || req.headers.get('x-webhook-timestamp') || payload.timestamp;
    // Validasi kesegaran timestamp untuk mencegah replay webhook lama.
    const tsNum = parseInt(headerTimestamp, 10);
    const MAX_SKEW_MS = 5 * 60 * 1000; // 5 menit
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > MAX_SKEW_MS) {
      console.error('Webhook Error: Stale or invalid timestamp', { headerTimestamp });
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 401 });
    }
    const signatureData = `${payload.invoice_id}|${payload.status}|${payload.final_amount}|${headerTimestamp}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(signatureData).digest('hex');
    // ponytail: timingSafeEqual butuh panjang sama, cek dulu agar tidak throw
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('Webhook Error: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (payload.status && payload.status.toLowerCase() === 'paid') {
      // Atomic: cari + update + credit dalam satu transaction untuk prevent race condition
      const result = await prisma.$transaction(async (tx) => {
        // findFirst dengan filter status: 'pending' untuk idempotency
        const transaction = await tx.transactions.findFirst({
          where: {
            status: 'pending',
            meta_data: { path: ['bayargg_invoice_id'], equals: payload.invoice_id }
          }
        });

        // Sudah diproses sebelumnya (idempotent) atau tidak ditemukan → skip
        if (!transaction) return null;

        await tx.transactions.update({
          where: { id: transaction.id },
          data: { status: 'completed' }
        });

        await tx.profiles.update({
          where: { id: transaction.user_id },
          data: { vcoin_balance: { increment: transaction.amount } }
        });

        return transaction;
      });

      if (!result) {
        // Sudah diproses sebelumnya — return sukses agar Bayar.gg tidak retry
        console.log('Webhook: invoice already processed or not found:', payload.invoice_id);
      } else {
        console.log('Webhook: processed successfully, invoice:', payload.invoice_id, 'amount:', result.amount);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
