import { auth } from "@/lib/auth";
import { updateKeepEmail } from "@/lib/kv";
import { keepEmailSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = keepEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await updateKeepEmail(session.userId, parsed.data.keepEmailAddress);

    return NextResponse.json({
      success: true,
      keepEmailAddress: parsed.data.keepEmailAddress,
    });
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
