import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");

  // APIルートは認証ミドルウェアをスキップ（各APIで個別にチェック）
  if (isApiRoute) {
    return NextResponse.next();
  }

  // 未認証ユーザーはログインページへリダイレクト
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 認証済みユーザーがログインページにアクセスした場合はメインへ
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*\\.js).*)",
  ],
};
