import { auth } from "@/lib/auth";
import { getUserData } from "@/lib/kv";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    const userData = await getUserData(session.userId);
    if (!userData) {
      return NextResponse.json({
        success: true,
        data: {
          email: session.user?.email || "",
          hasPassword: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: userData.email,
        hasPassword: !!userData.googlePassword,
      },
    });
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
