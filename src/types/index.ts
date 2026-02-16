// ユーザー情報 (Vercel KV)
export interface UserData {
  email: string;
  googlePassword: string; // 暗号化済み（アプリパスワード推奨）
  createdAt: string;
  updatedAt: string;
}

// 未送信メモ (Vercel KV)
export interface PendingMemo {
  content: string;
  retryCount: number;
  lastAttempt: number;
  error?: string;
}

// 未送信メモ (IndexedDB - クライアント側)
export interface LocalMemo {
  id: string;
  content: string;
  createdAt: number;
  synced: boolean;
}

// APIレスポンス
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 送信ステータス
export type SendStatus = "idle" | "sending" | "success" | "error";

// 設定データ
export interface SettingsData {
  email: string;
  hasPassword: boolean;
}
