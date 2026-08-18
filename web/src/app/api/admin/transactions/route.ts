import { NextResponse } from 'next/server';
import { prisma } from "@/utils/prisma";
import { getUser } from '@/utils/auth';
import { safeErrorResponse } from '@/utils/security';

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const { searchParams } = new URL(req.url);

    const filterType = searchParams.get('type');
    const whereClause: any = filterType === 'all' ? {} : { type: filterType || 'topup' };

    // Date range filters
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    if (fromDate) whereClause.created_at = { ...(whereClause.created_at || {}), gte: new Date(fromDate) };
    if (toDate) whereClause.created_at = { ...(whereClause.created_at || {}), lte: new Date(toDate) };

    // Username search
    const search = searchParams.get('search');
    const usernameFilter = searchParams.get('username');
    if (search || usernameFilter) {
      const searchTerm = search || usernameFilter;
      const matchingProfiles = await prisma.profiles.findMany({
        where: { username: { contains: searchTerm!, mode: 'insensitive' } },
        select: { id: true }
      });
      whereClause.user_id = { in: matchingProfiles.map(p => p.id) };
    }

    const transactions = await prisma.transactions.findMany({
      where: whereClause, orderBy: { created_at: 'desc' }, take: 200,
      include: { profile: { select: { username: true } } }
    });

    // Calculate summary
    const summary = {
      count: transactions.length,
      sumAmount: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      pendingCount: transactions.filter(tx => tx.status === 'pending').length
    };

    return NextResponse.json({ transactions, summary });
  } catch (err: any) { 
    return safeErrorResponse(err, 'Gagal memuat data transaksi admin.'); 
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const { id, status } = await req.json();
    const tx = await prisma.transactions.update({ where: { id }, data: { status } });
    if (status === 'completed') {
      await prisma.profiles.update({ where: { id: tx.user_id }, data: { vcoin_balance: { increment: tx.amount } } });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) { 
    return safeErrorResponse(err, 'Gagal memperbarui status transaksi.'); 
  }
}
