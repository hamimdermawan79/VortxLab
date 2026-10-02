import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { getUser } from '@/utils/auth';
import { prisma } from '@/utils/prisma';
import { safeErrorResponse } from '@/utils/security';
import { getUploadsDataDir } from '@/utils/uploads';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    // Auto-cleanup abandoned 'pending_confirmation' jobs for this user
    await prisma.extractor_jobs.deleteMany({
      where: {
        user_id: user.id,
        status: { in: ['pending_confirmation', 'uploaded'] }
      }
    });

    const contentType = req.headers.get('content-type') || '';
    const timestamp = Date.now().toString();
    // Storage dipindah dari public/ ke private/ — file kredensial user TIDAK boleh dilayani statis.
    const saveDir = path.join(getUploadsDataDir(), timestamp);
    await mkdir(saveDir, { recursive: true });

    let filename = `archive_${timestamp}.zip`;
    let savePath = path.resolve(saveDir, filename);

    // MODE 1: Direct Binary Stream (Preferred, bypasses FormData limits)
    if (contentType.includes('application/octet-stream') || req.headers.get('x-filename')) {
      const headerName = req.headers.get('x-filename');
      if (headerName) {
        try {
          filename = decodeURIComponent(headerName);
        } catch {
          filename = headerName;
        }
      }
      // Sanitasi path traversal: ambil basename saja, buang direktori.
      filename = path.basename(filename);
      if (!filename.toLowerCase().endsWith('.zip')) {
        filename += '.zip';
      }

      savePath = path.resolve(saveDir, filename);
      // Containment check: pastikan hasil resolve tetap di dalam saveDir.
      if (!savePath.startsWith(saveDir + path.sep)) {
        return NextResponse.json({ error: 'INVALID_FILENAME', message: 'Nama file tidak valid.' }, { status: 400 });
      }

      if (!req.body) {
        return NextResponse.json({ error: 'NO_BODY', message: 'Tidak ada data file dalam request.' }, { status: 400 });
      }

      // @ts-ignore
      const nodeReadable = Readable.fromWeb(req.body);
      await pipeline(nodeReadable, createWriteStream(savePath));
    }
    // MODE 2: Standard FormData Upload (Fallback)
    else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

      filename = path.basename(file.name || 'archive.zip');
      if (!filename.toLowerCase().endsWith('.zip')) {
        return NextResponse.json({ error: 'INVALID_FORMAT', message: 'Hanya file .zip yang didukung saat ini' }, { status: 400 });
      }

      savePath = path.resolve(saveDir, filename);
      if (!savePath.startsWith(saveDir + path.sep)) {
        return NextResponse.json({ error: 'INVALID_FILENAME', message: 'Nama file tidak valid.' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(savePath, buffer);
    }

    // LAPISAN 1: Wajib ekstensi .conf & Deduplikasi File (Content MD5 & Basename)
    let totalConf = 0;
    let dupConfCount = 0;
    try {
      const zip = new AdmZip(savePath);
      const entries = zip.getEntries();
      const seenHashes = new Set<string>();
      const seenBasenames = new Set<string>();

      for (const entry of entries) {
        if (!entry.isDirectory && !entry.entryName.startsWith('__MACOSX') && !entry.entryName.endsWith('.DS_Store')) {
          const lower = entry.entryName.toLowerCase();
          // Lapisan 1: WAJIB ekstensi .conf
          if (lower.endsWith('.conf')) {
            const rawData = entry.getData();
            const contentHash = crypto.createHash('md5').update(rawData).digest('hex');
            const baseName = path.basename(entry.entryName).toLowerCase();

            // Cek duplikasi berdasarkan content hash atau nama file identik
            if (seenHashes.has(contentHash) || seenBasenames.has(baseName)) {
              dupConfCount++;
            } else {
              seenHashes.add(contentHash);
              seenBasenames.add(baseName);
            }
          }
        }
      }
      totalConf = seenHashes.size;
    } catch (zipErr: any) {
      console.error('ZIP read error:', zipErr);
      return NextResponse.json({
        error: 'INVALID_ZIP',
        message: 'File .zip rusak atau melebihi batas 10MB sehingga terpotong saat diunggah. Pastikan ukuran file maksimal 10MB.'
      }, { status: 400 });
    }

    if (totalConf === 0) {
      return NextResponse.json({
        error: 'NO_CONF_FILES',
        message: 'Tidak ditemukan file berekstensi .conf yang valid dalam arsip .zip ini.'
      }, { status: 400 });
    }

    // Fetch cost per file config (default: 5 token per .conf)
    let costPerConf = 5;
    try {
      const cfg = await prisma.service_configs.findUnique({
        where: { service_type: 'data-extractor' }
      });
      if (cfg && cfg.cost_per_id) {
        costPerConf = cfg.cost_per_id;
      }
    } catch {}

    const totalCost = totalConf * costPerConf;

    // Create job in 'pending_confirmation' state (Awaiting user approval & payment)
    const job = await prisma.extractor_jobs.create({
      data: {
        user_id: user.id,
        original_name: filename,
        total_conf: totalConf,
        total_extracted: 0,
        dup_removed: dupConfCount,
        total_cost: totalCost,
        status: 'pending_confirmation',
        result_data: { file_path: savePath, total_conf: totalConf }
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      fileName: filename,
      totalConf,
      dupRemoved: dupConfCount,
      totalCost,
      costPerConf,
      status: 'pending_confirmation',
      message: 'Deduplikasi file selesai. Menunggu konfirmasi proses ekstraksi.'
    });

  } catch (err: any) {
    return safeErrorResponse(err, 'Gagal memproses file arsip di server.');
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
      results: job.status === 'completed' && Array.isArray(rawData?.entries) ? rawData.entries : (Array.isArray(rawData) ? rawData : null),
      txtOutput: rawData?.txt_output || null,
      error: rawData?.error || null
    });
  } catch (err: any) {
    console.error('Extractor poll error:', err);
    return NextResponse.json({ error: 'POLLING_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'MISSING_JOB_ID' }, { status: 400 });

    const job = await prisma.extractor_jobs.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
    if (job.user_id !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // If job was already processing and deducted, refund token balance
    if (job.status === 'processing' || job.status === 'pending_processing') {
      await prisma.$transaction([
        prisma.profiles.update({
          where: { id: user.id },
          data: { vcoin_balance: { increment: job.total_cost } }
        }),
        prisma.transactions.create({
          data: {
            user_id: user.id,
            type: 'refund-extractor',
            amount: job.total_cost,
            status: 'completed',
            meta_data: { job_id: jobId, reason: 'user_cancelled' }
          }
        }),
        prisma.extractor_jobs.delete({ where: { id: jobId } })
      ]);
    } else {
      await prisma.extractor_jobs.delete({ where: { id: jobId } });
    }

    return NextResponse.json({ success: true, message: 'Proses ekstraksi berhasil dibatalkan.' });
  } catch (err: any) {
    console.error('Extractor cancel error:', err);
    return NextResponse.json({ error: 'CANCEL_ERROR', details: err.message }, { status: 500 });
  }
}
