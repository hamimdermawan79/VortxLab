import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { getUser } from '@/utils/auth';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

function extractIdsFromContent(content: string, minLen = 6, maxLen = 9): string[] {
  const digitRegex = /\b\d+\b/g;
  const seen = new Set<string>();
  const extracted: string[] = [];
  let match;
  while ((match = digitRegex.exec(content)) !== null) {
    const num = match[0];
    if (num.length >= minLen && num.length <= maxLen && !seen.has(num)) {
      seen.add(num);
      extracted.push(num);
    }
  }
  return extracted;
}

function parseConfigFileOffline(content: string): Array<{ id: string; pw: string; mac: string }> {
  let mac = '';
  const macMatch = content.match(/local_mac_addr\s*=\s*([A-Fa-f0-9:]+)/i) ||
                   content.match(/local_mac_addr(?:["']?\s*>\s*|\s*=\s*|\s*:\s*)([^\s<"']+)/i) ||
                   content.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
  if (macMatch) {
    mac = (macMatch[1] || macMatch[0]).trim();
  }

  const passwords: string[] = [];
  const pwRegex = /hw_account_password_\d*(?:["']?\s*>\s*|\s*=\s*|\s*:\s*)([^\s<"']+)/gi;
  let pwMatch;
  while ((pwMatch = pwRegex.exec(content)) !== null) {
    if (pwMatch[1]) passwords.push(pwMatch[1].trim());
  }

  const explicitIds: string[] = [];
  const idRegex = /hw_account_id_\d*(?:["']?\s*>\s*|\s*=\s*|\s*:\s*)(\d+)/gi;
  let idMatch;
  while ((idMatch = idRegex.exec(content)) !== null) {
    const idVal = idMatch[1].trim();
    if (idVal.length >= 6 && idVal.length <= 9) {
      explicitIds.push(idVal);
    }
  }

  let accountIds: string[] = [];
  if (explicitIds.length > 0) {
    accountIds = Array.from(new Set(explicitIds));
  } else {
    accountIds = extractIdsFromContent(content, 6, 9);
  }

  if (accountIds.length > 0 && passwords.length === 0) {
    passwords.push('');
  }

  const entries: Array<{ id: string; pw: string; mac: string }> = [];
  for (const accId of accountIds) {
    for (const pw of passwords) {
      entries.push({
        id: String(accId),
        pw: String(pw),
        mac: mac || 'NO_MAC'
      });
    }
  }
  return entries;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: 'MISSING_JOB_ID' }, { status: 400 });

    const job = await prisma.extractor_jobs.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
    if (job.user_id !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // Allow pending_confirmation, uploaded, or pending_processing
    if (job.status !== 'pending_confirmation' && job.status !== 'uploaded' && job.status !== 'pending_processing') {
      return NextResponse.json({ error: 'INVALID_STATUS', message: 'Status pekerjaan tidak valid untuk diproses.' }, { status: 400 });
    }

    const profile = await prisma.profiles.findUnique({ where: { id: user.id } });
    if (!profile || profile.vcoin_balance < job.total_cost) {
      return NextResponse.json({ error: 'INSUFFICIENT_BALANCE', message: 'Saldo token tidak mencukupi.' }, { status: 402 });
    }

    // Locate the zip file on server storage
    const rawData = (job.result_data as any) || {};
    let filePath = rawData.file_path || '';

    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: check uploads/data directories
      const possibleDirs = [
        path.join(process.cwd(), 'public', 'uploads', 'data'),
        path.join(process.cwd(), 'web', 'public', 'uploads', 'data'),
        path.join(process.cwd(), '..', 'web', 'public', 'uploads', 'data')
      ];
      for (const d of possibleDirs) {
        if (fs.existsSync(d)) {
          const subdirs = fs.readdirSync(d);
          for (const s of subdirs) {
            const candidate = path.join(d, s, job.original_name);
            if (fs.existsSync(candidate)) {
              filePath = candidate;
              break;
            }
          }
        }
        if (filePath && fs.existsSync(filePath)) break;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'FILE_NOT_FOUND', message: 'File zip arsip tidak ditemukan di server.' }, { status: 404 });
    }

    // Execute instant 100% OFFLINE extraction on local disk
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();

    const rawEntries: Array<{ id: string; pw: string; mac: string }> = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || entry.entryName.endsWith('.DS_Store')) {
        continue;
      }

      const lower = entry.entryName.toLowerCase();
      if (lower.endsWith('.conf') || lower.endsWith('.txt') || lower.endsWith('.dat') || lower.endsWith('.csv')) {
        try {
          const content = entry.getData().toString('utf8');

          // Check line by line for structured format
          const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          let fileHasLines = false;

          for (const line of lines) {
            const delims = [',', ':', '----', '|', '\t'];
            for (const d of delims) {
              if (line.includes(d)) {
                const parts = line.split(d).map(p => p.trim());
                if (parts.length >= 2 && /^\d{6,9}$/.test(parts[0])) {
                  rawEntries.push({
                    id: parts[0],
                    pw: parts[1] || '',
                    mac: parts[2] || 'NO_MAC'
                  });
                  fileHasLines = true;
                  break;
                }
              }
            }
          }

          if (!fileHasLines) {
            const extracted = parseConfigFileOffline(content);
            rawEntries.push(...extracted);
          }
        } catch (readErr) {
          console.error(`Error reading ${entry.entryName}:`, readErr);
        }
      }
    }

    // Filter valid 6-9 digit IDs
    const validEntries = rawEntries.filter(e => e.id && e.id.length >= 6 && e.id.length <= 9);

    // Deduplicate (id, pw)
    const seenKeys = new Set<string>();
    const uniqueEntries: Array<{ id: string; pw: string; mac: string }> = [];
    let dupRemoved = 0;

    for (const entry of validEntries) {
      const key = `${entry.id}_${entry.pw}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEntries.push(entry);
      } else {
        dupRemoved++;
      }
    }

    // Build standard text output: ID: ... PW: ... MAC: ...
    const txtLines = uniqueEntries.map(e => {
      const macStr = e.mac && e.mac !== 'NO_MAC' ? ` MAC: ${e.mac}` : '';
      return `ID: ${e.id} PW: ${e.pw}${macStr}`.trim();
    });
    const txtOutput = txtLines.join('\n');

    // Deduct token & save completed result in atomic transaction
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
            conf_count: job.total_conf, 
            cost: job.total_cost,
            extracted_count: uniqueEntries.length,
            job_id: jobId
          }
        }
      }),
      prisma.extractor_jobs.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          total_extracted: uniqueEntries.length,
          dup_removed: dupRemoved,
          result_data: {
            file_path: filePath,
            entries: uniqueEntries,
            txt_output: txtOutput
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      status: 'completed',
      jobId: job.id,
      totalExtracted: uniqueEntries.length,
      dupRemoved,
      results: uniqueEntries,
      txtOutput,
      message: 'Ekstraksi selesai secara instan.'
    });

  } catch (err: any) {
    console.error('Extractor confirm error:', err);
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message || 'Gagal memproses ekstraksi.' }, { status: 500 });
  }
}
