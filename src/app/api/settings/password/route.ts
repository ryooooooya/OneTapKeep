import { auth } from "@/lib/auth";
import { saveUserData } from "@/lib/kv";
import { encryptPassword } from "@/lib/crypto";
import { passwordSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.userId || !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const encryptedPassword = encryptPassword(parsed.data.password);

    await saveUserData(session.userId, {
      email: session.user.email,
      googlePassword: encryptedPassword,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
