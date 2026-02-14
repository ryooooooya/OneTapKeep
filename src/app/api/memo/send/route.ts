import { auth } from "@/lib/auth";
import { getUserData, saveUserData, savePendingMemo } from "@/lib/kv";
import { sendMemoToKeep, refreshAccessToken } from "@/lib/gmail";
import { memoSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
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

    if (!userData.keepEmailAddress) {
      return NextResponse.json(
        { success: false, error: "Keep用メールアドレスが設定されていません" },
        { status: 400 }
      );
    }

    // トークンの有効期限チェックとリフレッシュ
    let accessToken = userData.accessToken;

    if (Date.now() >= userData.tokenExpiry) {
      try {
        const refreshed = await refreshAccessToken(userData.refreshToken);
        accessToken = refreshed.accessToken;
        await saveUserData(session.userId, {
          accessToken: refreshed.accessToken,
          tokenExpiry: refreshed.expiresAt,
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "認証の更新に失敗しました。再ログインしてください" },
          { status: 401 }
        );
      }
    }

    // メール送信
    try {
      await sendMemoToKeep(accessToken, userData.keepEmailAddress, content);
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
