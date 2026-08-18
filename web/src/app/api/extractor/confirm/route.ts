import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/utils/auth';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: 'MISSING_JOB_ID' }, { status: 400 });

    const job = await prisma.extractor_jobs.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
    if (job.user_id !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    if (job.status !== 'uploaded') return NextResponse.json({ error: 'INVALID_STATUS', message: 'Job belum siap dikonfirmasi.' }, { status: 400 });

    const profile = await prisma.profiles.findUnique({ where: { id: user.id } });
    if (!profile || profile.vcoin_balance < job.total_cost) {
      return NextResponse.json({ error: 'INSUFFICIENT_BALANCE', message: 'Saldo token tidak mencukupi.' }, { status: 402 });
    }

    // Atomically deduct token & complete job
    await prisma.$transaction([
      prisma.profiles.update({
        where: { id: user.id },
        data: { vcoin_balance: { decrement: job.total_cost } }
      }),
      prisma.transactions.create({
        data: {
          user_id: user.id,
          type: 'data-extractor',
          amount: -job.total_cost,
          status: 'completed',
          meta_data: { 
            entries_count: job.total_extracted, 
            cost_per_id: job.total_cost / Math.max(1, job.total_extracted),
            job_id: jobId
          }
        }
      }),
      prisma.extractor_jobs.update({
        where: { id: jobId },
        data: { status: 'completed' }
      })
    ]);

    return NextResponse.json({
      success: true,
      status: 'completed',
      totalExtracted: job.total_extracted
    });
  } catch (err: any) {
    console.error('Extractor confirm error:', err);
    return NextResponse.json({ error: 'SERVER_ERROR', details: err.message }, { status: 500 });
  }
}
