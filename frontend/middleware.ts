/**
 * Next.js Middleware
 * 保护受限路由，未登录用户重定向到登录页
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要登录才能访问的路由
const protectedRoutes = [
  '/',
  '/patients',
  '/projects',
  '/settings',
];

// 公开路由（无需登录）
const publicRoutes = [
  '/login',
  '/reset-password',
  '/activate',
  '/otp',
  '/signup',
  '/confirm-email',
  '/revert-email',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 检查是否是公开路由
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 从 Cookie 中检查 Django Session
  // Django 默认使用 'sessionid' 作为 session cookie 名称
  const sessionId = request.cookies.get('sessionid');
  const isAuthenticated = !!sessionId;

  // 未登录用户访问受保护路由 -> 重定向到登录页
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // 保存原始访问地址，登录后可以跳转回来
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录用户访问公开路由（如登录页）-> 重定向到首页
  if (isPublicRoute && isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 匹配所有路由，排除静态资源和 API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|fonts|avatars|images|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
