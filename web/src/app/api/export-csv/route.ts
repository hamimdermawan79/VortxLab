import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const { csvData, filename } = await request.json();
    if (!csvData || !filename) return NextResponse.json({ error: 'Missing csvData or filename' }, { status: 400 });
    return new Response(csvData, {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch { return NextResponse.json({ error: 'Export failed' }, { status: 500 }); }
}
