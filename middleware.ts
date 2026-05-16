import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    if (!token) return NextResponse.next();
    const role = (token as any).role as string | undefined;
    if (role === 'super_admin') return NextResponse.redirect(new URL('/admin', request.url));
    if (role === 'manager') return NextResponse.redirect(new URL('/manager', request.url));
    if (role === 'employee') return NextResponse.redirect(new URL('/employee', request.url));
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = (token as any).role as string | undefined;

  if (pathname.startsWith('/dashboard')) {
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (role === 'manager') {
      return NextResponse.redirect(new URL('/manager', request.url));
    }
    if (role === 'employee') {
      return NextResponse.redirect(new URL('/employee', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/admin') && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/manager') && role !== 'manager') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/employee') && role !== 'employee') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/admin/:path*', '/manager/:path*', '/employee/:path*'],
};
