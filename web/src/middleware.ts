import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/utils/jwt';

export async function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isAdmin = request.nextUrl.pathname.startsWith('/admin');
  if (!isDashboard && !isAdmin) return NextResponse.next();

  const token = request.cookies.get("vortx_session")?.value;
  if (!token) return NextResponse.redirect(new URL('/', request.url));

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (isAdmin && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
