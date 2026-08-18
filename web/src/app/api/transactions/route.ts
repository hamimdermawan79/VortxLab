import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { getUser } from '@/utils/auth';

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    // Auto-expire pending topup transactions older than 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await prisma.transactions.updateMany({
      where: {
        user_id: user.id,
        status: 'pending',
        type: 'topup',
        created_at: { lt: fifteenMinutesAgo },
      },
      data: {
        status: 'expired',
      },
    });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'topup';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '3', 10)));
    const skip = (page - 1) * limit;

    const where = {
      user_id: user.id,
      ...(type !== 'all' ? { type } : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          created_at: true,
          meta_data: true,
        },
      }),
      prisma.transactions.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('Transactions API Error:', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
