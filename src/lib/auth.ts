import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { saveUserData } from "@/lib/kv";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 初回ログイン時にトークン情報を保存
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // Vercel KVにユーザー情報を保存
        if (token.sub) {
          await saveUserData(token.sub, {
            email: profile.email || "",
            accessToken: account.access_token || "",
            refreshToken: account.refresh_token || "",
            tokenExpiry: (account.expires_at || 0) * 1000,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // トークンの有効期限チェック
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // トークンが期限切れの場合、リフレッシュを試みる
      if (token.refreshToken) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });

          const tokens = await response.json();

          if (!response.ok) throw tokens;

          token.accessToken = tokens.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000 + tokens.expires_in);

          // KVも更新
          if (token.sub) {
            await saveUserData(token.sub, {
              accessToken: tokens.access_token,
              tokenExpiry: Date.now() + tokens.expires_in * 1000,
            });
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.userId = token.sub as string;
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // セットアップ完了チェック
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
