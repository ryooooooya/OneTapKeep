import { Redis } from "@upstash/redis";
import type { UserData, PendingMemo } from "@/types";

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return _redis;
}

// ユーザー情報を保存
export async function saveUserData(
  userId: string,
  data: Partial<UserData>
): Promise<void> {
  const redis = getRedis();
  const key = `user:${userId}`;
  const existing = await redis.get<UserData>(key);

  const updated: UserData = {
    email: "",
    googlePassword: "",
    createdAt: new Date().toISOString(),
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(key, JSON.stringify(updated));
}

// ユーザー情報を取得
export async function getUserData(
  userId: string
): Promise<UserData | null> {
  const key = `user:${userId}`;
  return await getRedis().get<UserData>(key);
}

// Googleパスワードを更新
export async function updatePassword(
  userId: string,
  encryptedPassword: string
): Promise<void> {
  await saveUserData(userId, { googlePassword: encryptedPassword });
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
  await getRedis().set(key, JSON.stringify(memo));
}

// 未送信メモを取得
export async function getPendingMemos(
  userId: string
): Promise<Map<string, PendingMemo>> {
  const redis = getRedis();
  const pattern = `pending:${userId}:*`;
  const keys: string[] = await redis.keys(pattern);
  const memos = new Map<string, PendingMemo>();

  for (const key of keys) {
    const memo = await redis.get<PendingMemo>(key);
    if (memo) {
      memos.set(key, memo);
    }
  }

  return memos;
}

// 未送信メモを削除
export async function deletePendingMemo(key: string): Promise<void> {
  await getRedis().del(key);
}
