import { NextResponse } from 'next/server'
import { prisma } from "@/utils/prisma";
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const { amount } = await req.json()
    const amountNum = parseInt(amount, 10)
    if (!amountNum || isNaN(amountNum) || amountNum < 10000) {
      return NextResponse.json({ error: 'Minimum Transaksi TopUp: 10.000 IDR' }, { status: 400 })
    }

    const cashiApiKey = process.env.CASHI_API_KEY;
    if (!cashiApiKey) {
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED', details: 'Cashi API Key not configured' }, { status: 500 })
    }

    const orderId = `VOR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const tx = await prisma.transactions.create({
      data: {
        user_id: user.id,
        amount: amountNum,
        type: 'topup',
        status: 'pending',
        meta_data: { cashi_order_id: orderId }
      }
    });

    const cashiPayload = {
      order_id: orderId,
      amount: amountNum
    };

    const cashiResponse = await fetch('https://cashi.id/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cashiApiKey
      },
      body: JSON.stringify(cashiPayload)
    });

    const cashiStatus = cashiResponse.status;
    const cashiText = await cashiResponse.text();
    let cashiData: any;
    try {
      cashiData = JSON.parse(cashiText);
    } catch {
      cashiData = { raw: cashiText };
    }

    if (!cashiResponse.ok || cashiData.success === false) {
      console.error('[Cashi Debug] Error creating order:', { status: cashiStatus, body: cashiData });
      await prisma.transactions.update({ where: { id: tx.id }, data: { status: 'failed' } });
      return NextResponse.json({
        error: 'PAYMENT_GATEWAY_ERROR',
        details: cashiData.message || cashiData.error || cashiData,
        httpStatus: cashiStatus
      }, { status: 500 });
    }

    const returnedOrderId = cashiData.orderId || cashiData.data?.orderId || orderId;
    const qrisUrl = cashiData.qrUrl || cashiData.data?.qrUrl || (cashiData.qr_string ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cashiData.qr_string)}` : '');
    const checkoutUrl = cashiData.checkout_url || cashiData.data?.checkout_url || `https://cashi.id/pay/${returnedOrderId}`;

    const baseUrl = process.env.BASE_URL || (req.headers.get('x-forwarded-proto') === 'https' ? `https://${req.headers.get('host')}` : `http://${req.headers.get('host') || 'localhost:3000'}`);
    const customPaymentUrl = `${baseUrl}/pay?invoice=${returnedOrderId}`;

    await prisma.transactions.update({
      where: { id: tx.id },
      data: {
        meta_data: {
          cashi_order_id: returnedOrderId,
          qris_url: qrisUrl,
          payment_url: checkoutUrl,
          custom_payment_url: customPaymentUrl
        }
      }
    });

    return NextResponse.json({
      success: true,
      payment_url: checkoutUrl,
      invoice_id: returnedOrderId,
      qris_url: qrisUrl
    });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal memproses transaksi top-up.");
  }
}
