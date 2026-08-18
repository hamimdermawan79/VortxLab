import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const validLines = lines.filter(l => /ID:\s*\S+/i.test(l) && /PW:\s*\S+/i.test(l) && /MAC:\s*\S+/i.test(l));
    const rawEntries = validLines.map(l => {
      const id = l.match(/ID:\s*(\S+)/i)?.[1] || '';
      const pw = l.match(/PW:\s*(\S+)/i)?.[1] || '';
      const mac = l.match(/MAC:\s*(\S+)/i)?.[1] || '';
      return { id, pw, mac };
    });

    const seen = new Set<string>();
    const deduped: typeof rawEntries = [];
    rawEntries.forEach(e => {
      if (e.id && !seen.has(e.id)) { seen.add(e.id); deduped.push(e); }
    });
    const dupCount = rawEntries.length - deduped.length;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, deduped.map(e => `ID: ${e.id} PW: ${e.pw} MAC: ${e.mac}`).join('\n'), 'utf-8');

    return NextResponse.json({
      totalLines: lines.length,
      validBefore: validLines.length,
      validAfter: deduped.length,
      dupCount,
      entries: deduped,
      savedPath: `/uploads/${fileName}`,
      originalName: file.name,
      invalidLines: lines.length - validLines.length,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed', details: err.message }, { status: 500 });
  }
}