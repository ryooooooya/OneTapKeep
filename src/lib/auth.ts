import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { saveUserData } from "@/lib/kv";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile }) {
      // 初回ログイン時にユーザー情報を保存
      if (account && profile && token.sub) {
        await saveUserData(token.sub, {
          email: profile.email || "",
          createdAt: new Date().toISOString(),
        });
      }
      return token;
    },
  },
});
