import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getUser } from '@/utils/auth';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    // Auto-cleanup abandoned 'uploaded' or 'pending_analysis' jobs
    await prisma.extractor_jobs.deleteMany({
      where: {
        user_id: user.id,
        status: { in: ['uploaded', 'pending_analysis', 'processing_analysis'] }
      }
    });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'INVALID_FORMAT', message: 'Hanya file .zip yang didukung saat ini' }, { status: 400 });
    }

    // Support large files up to 500MB
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE', message: 'Maksimal ukuran file adalah 500MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save stream directly to disk storage
    const timestamp = Date.now().toString();
    const saveDir = path.join(process.cwd(), 'public', 'uploads', 'data', timestamp);
    await mkdir(saveDir, { recursive: true });
    const savePath = path.resolve(saveDir, file.name);
    await writeFile(savePath, buffer);

    // Create job record for Python worker to process
    const job = await prisma.extractor_jobs.create({
      data: {
        user_id: user.id,
        original_name: file.name,
        total_conf: 0,
        total_extracted: 0,
        dup_removed: 0,
        total_cost: 0,
        status: 'pending_analysis',
        result_data: { file_path: savePath }
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'File berhasil diunggah. Engine Python sedang memproses analisis...'
    });

  } catch (err: any) {
    console.error('Extractor upload error:', err);
    return NextResponse.json({ error: 'Upload failed', message: err.message || 'Gagal menyimpan file di server' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'MISSING_JOB_ID' }, { status: 400 });

    const job = await prisma.extractor_jobs.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
    if (job.user_id !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const rawData = job.result_data as any;

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      totalConf: job.total_conf,
      totalExtracted: job.total_extracted,
      dupRemoved: job.dup_removed,
      totalCost: job.total_cost,
      results: job.status === 'completed' && Array.isArray(rawData) ? rawData : null,
      error: rawData?.error || null
    });
  } catch (err: any) {
    console.error('Extractor poll error:', err);
    return NextResponse.json({ error: 'POLLING_ERROR' }, { status: 500 });
  }
}
