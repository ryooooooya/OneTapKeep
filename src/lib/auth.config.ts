import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

// Edge Runtime互換の設定（ミドルウェアで使用）
// Node.js専用モジュール（@upstash/redis等）をインポートしない
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      session.userId = token.sub as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
