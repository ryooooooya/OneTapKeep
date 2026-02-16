import { z } from "zod";

export const memoSchema = z.object({
  content: z
    .string()
    .min(1, "メモが空です")
    .max(10000, "メモが長すぎます（最大10,000文字）"),
});

export const passwordSchema = z.object({
  password: z
    .string()
    .min(1, "パスワードを入力してください"),
});
