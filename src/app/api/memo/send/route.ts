import { auth } from "@/lib/auth";
import { getUserData, savePendingMemo } from "@/lib/kv";
import { decryptPassword } from "@/lib/crypto";
import { memoSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.userId || !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = memoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    const userData = await getUserData(session.userId);
    if (!userData) {
      return NextResponse.json(
        { success: false, error: "ユーザー情報が見つかりません" },
        { status: 404 }
      );
    }

    if (!userData.googlePassword) {
      return NextResponse.json(
        { success: false, error: "パスワードが設定されていません" },
        { status: 400 }
      );
    }

    // パスワードを復号化
    const password = decryptPassword(userData.googlePassword);

    // Python Serverless Functionを呼び出してKeepにメモを作成
    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const pythonRes = await fetch(`${baseUrl}/api/keep/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          password,
          content,
        }),
      });

      if (!pythonRes.ok) {
        const errorData = await pythonRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Keep APIの実行に失敗しました");
      }
    } catch (error) {
      console.error("メモ送信エラー:", error);
      // 送信失敗時はKVに保存してリトライ用にする
      await savePendingMemo(session.userId, content);
      return NextResponse.json(
        { success: false, error: "メモの送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "メモを送信しました",
    });
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
