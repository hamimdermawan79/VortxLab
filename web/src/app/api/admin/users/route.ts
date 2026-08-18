import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const users = await prisma.profiles.findMany({ orderBy: { created_at: 'desc' }, select: { id: true, username: true, phone: true, role: true, vcoin_balance: true, created_at: true } });
    const usersWithStatus = users.map((u: any) => ({ ...u, email: u.phone || "N/A", status: "active" }));
    return NextResponse.json(usersWithStatus);
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memuat data pengguna.');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { action, userId, amount } = await req.json();
    if (action === 'adjust_coin') {
      await prisma.$transaction([
        prisma.profiles.update({ where: { id: userId }, data: { vcoin_balance: { increment: amount } } }),
        prisma.transactions.create({ data: { user_id: userId, type: 'adjustment', amount: amount, status: 'completed', meta_data: { description: `Manual adjustment by admin: ${amount > 0 ? '+' : ''}${amount} Coin` } } })
      ]);
      return NextResponse.json({ message: 'Coin adjusted successfully' });
    }
    if (action === 'delete') {
      await prisma.profiles.delete({ where: { id: userId } });
      return NextResponse.json({ message: 'User deleted successfully' });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return safeErrorResponse(error, 'Gagal memproses aksi pengguna.');
  }
}
