import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/utils/auth';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { csvData, filename } = await request.json();
    if (!csvData || !filename) return NextResponse.json({ error: 'Missing csvData or filename' }, { status: 400 });
    // Sanitasi filename: buang path + CRLF + karakter aneh (cegah header injection).
    const safeName = String(filename).replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(0, 100) || 'export.csv';
    return new Response(csvData, {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${safeName}"`, 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch { return NextResponse.json({ error: 'Export failed' }, { status: 500 }); }
}
