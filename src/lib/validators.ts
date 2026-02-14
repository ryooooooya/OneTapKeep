import { z } from "zod";

export const memoSchema = z.object({
  content: z
    .string()
    .min(1, "メモが空です")
    .max(10000, "メモが長すぎます（最大10,000文字）"),
});

export const keepEmailSchema = z.object({
  keepEmailAddress: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .refine(
      (email) => email.endsWith("@keep.google.com"),
      "Keep用メールアドレス（@keep.google.com）を入力してください"
    ),
});
