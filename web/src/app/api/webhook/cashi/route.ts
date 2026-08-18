import { NextResponse } from 'next/server';
import { prisma } from "@/utils/prisma";
import { safeErrorResponse, sanitizeLogData } from "@/utils/security";
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-gateway-signature') ||
                      req.headers.get('X-Gateway-Signature') ||
                      req.headers.get('x-webhook-signature') ||
                      req.headers.get('X-Webhook-Signature') || '';

    const secret = process.env.CASHI_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Cashi Webhook Error]: CASHI_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Signature WAJIB. Tanpa signature, webhook ditolak total (cegah kredit saldo palsu).
    if (!signature) {
      console.error('[Cashi Webhook Error]: Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    const computedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    // ponytail: timingSafeEqual butuh panjang sama, cek dulu agar tidak throw
    const sigBuf = Buffer.from(signature.toLowerCase());
    const expBuf = Buffer.from(computedSignature.toLowerCase());
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('[Cashi Webhook Error]: Invalid signature verification attempt');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Cashi Webhook]: Received event:', sanitizeLogData(payload));
    }

    const event = payload.event || payload.type;
    const data = payload.data || payload;
    const orderId = data.order_id || data.orderId || payload.order_id || payload.orderId;
    const status = (data.status || payload.status || '').toUpperCase();

    const isSettled = event === 'PAYMENT_SETTLED' || status === 'SETTLED' || status === 'PAID' || status === 'SUCCESS';

    if (isSettled && orderId) {
      const result = await prisma.$transaction(async (tx) => {
        // Cari transaksi pending dengan order_id yang cocok
        const transaction = await tx.transactions.findFirst({
          where: {
            status: 'pending',
            OR: [
              { meta_data: { path: ['cashi_order_id'], equals: orderId } },
              { meta_data: { path: ['bayargg_invoice_id'], equals: orderId } }
            ]
          }
        });

        // Sudah diproses sebelumnya (idempotent) atau tidak ditemukan
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
        console.log('[Cashi Webhook]: Order already processed or not pending:', orderId);
      } else {
        console.log('[Cashi Webhook]: Payment completed for order:', orderId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return safeErrorResponse(err, 'Internal Server Error');
  }
}
