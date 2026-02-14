import { kv } from "@vercel/kv";
import type { UserData, PendingMemo } from "@/types";

// ユーザー情報を保存
export async function saveUserData(
  userId: string,
  data: Partial<UserData>
): Promise<void> {
  const key = `user:${userId}`;
  const existing = await kv.get<UserData>(key);

  const updated: UserData = {
    email: "",
    keepEmailAddress: "",
    accessToken: "",
    refreshToken: "",
    tokenExpiry: 0,
    createdAt: new Date().toISOString(),
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(key, updated);
}

// ユーザー情報を取得
export async function getUserData(
  userId: string
): Promise<UserData | null> {
  const key = `user:${userId}`;
  return await kv.get<UserData>(key);
}

// Keep用メールアドレスを更新
export async function updateKeepEmail(
  userId: string,
  keepEmailAddress: string
): Promise<void> {
  await saveUserData(userId, { keepEmailAddress });
}

// 未送信メモを保存
export async function savePendingMemo(
  userId: string,
  content: string
): Promise<void> {
  const timestamp = Date.now();
  const key = `pending:${userId}:${timestamp}`;
  const memo: PendingMemo = {
    content,
    retryCount: 0,
    lastAttempt: timestamp,
  };
  await kv.set(key, memo);
}

// 未送信メモを取得
export async function getPendingMemos(
  userId: string
): Promise<Map<string, PendingMemo>> {
  const pattern = `pending:${userId}:*`;
  const keys = await kv.keys(pattern);
  const memos = new Map<string, PendingMemo>();

  for (const key of keys) {
    const memo = await kv.get<PendingMemo>(key);
    if (memo) {
      memos.set(key, memo);
    }
  }

  return memos;
}

// 未送信メモを削除
export async function deletePendingMemo(key: string): Promise<void> {
  await kv.del(key);
}
