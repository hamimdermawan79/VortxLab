import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const jobs = await prisma.sortir_banned_jobs.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        status: true,
        current_index: true,
        total_ids: true,
        created_at: true,
        cost: true,
        raw_results: true,
      },
      take: 20 // limit to last 20 jobs
    });

    const response = NextResponse.json({ jobs });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (err: any) {
    console.error('Sortir Banned History Error:', err)
    return NextResponse.json({ error: 'HISTORY_FETCH_ERROR' }, { status: 500 })
  }
}
