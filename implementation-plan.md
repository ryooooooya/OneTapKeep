# Google Keep Quick Memo - 実装計画書

## 実装フェーズ

### Phase 1: プロジェクトセットアップと基盤構築
### Phase 2: 認証機能の実装
### Phase 3: メモ送信機能の実装
### Phase 4: オフライン対応とPWA化
### Phase 5: UI/UX最適化とテスト
### Phase 6: デプロイと本番環境設定

---

## Phase 1: プロジェクトセットアップと基盤構築

### 1.1 Next.jsプロジェクト作成

```bash
npx create-next-app@latest keep-quick-memo
```

選択肢:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: Yes (@/*)

### 1.2 必要なパッケージのインストール

```bash
npm install next-auth@beta @auth/core
npm install @vercel/kv
npm install googleapis
npm install next-pwa
npm install idb # IndexedDB wrapper
npm install zod # バリデーション用
npm install react-hot-toast # トースト通知用
```

開発用:
```bash
npm install -D @types/node
npm install -D eslint-config-next
```

### 1.3 プロジェクト構造の作成

```
keep-quick-memo/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── setup/
│   │   │       └── page.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx          # メモ入力画面
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── history/          # オプション
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── memo/
│   │   │   │   └── send/
│   │   │   │       └── route.ts
│   │   │   └── settings/
│   │   │       ├── route.ts      # GET settings
│   │   │       └── keep-email/
│   │   │           └── route.ts  # PUT keep-email
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── MemoInput.tsx
│   │   ├── SendButton.tsx
│   │   ├── StatusIndicator.tsx
│   │   ├── OfflineNotice.tsx
│   │   └── Toast.tsx
│   ├── lib/
│   │   ├── auth.ts               # NextAuth設定
│   │   ├── gmail.ts              # Gmail API関連
│   │   ├── kv.ts                 # Vercel KV操作
│   │   ├── indexeddb.ts          # IndexedDB操作
│   │   └── utils.ts              # 汎用ユーティリティ
│   ├── types/
│   │   └── index.ts              # 型定義
│   └── middleware.ts             # 認証ミドルウェア
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── sw.js                     # Service Worker（next-pwaが生成）
├── .env.local                    # 環境変数
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### 1.4 環境変数の設定

`.env.local` を作成:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl>

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# Vercel KV
KV_URL=<from-vercel>
KV_REST_API_URL=<from-vercel>
KV_REST_API_TOKEN=<from-vercel>
KV_REST_API_READ_ONLY_TOKEN=<from-vercel>
```

NEXTAUTH_SECRET生成:
```bash
openssl rand -base64 32
```

### 1.5 TypeScript型定義の作成

`src/types/index.ts`:

```typescript
// ユーザー情報
export interface UserData {
  email: string;
  keepEmailAddress: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  createdAt: string;
  updatedAt: string;
}

// 未送信メモ（Vercel KV）
export interface PendingMemo {
  content: string;
  retryCount: number;
  lastAttempt: number;
  error?: string;
}

// 未送信メモ（IndexedDB）
export interface LocalMemo {
  id: string;
  content: string;
  createdAt: number;
  synced: boolean;
}

// API レスポンス
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 送信ステータス
export type SendStatus = 'idle' | 'sending' | 'success' | 'error';
```

---

## Phase 2: 認証機能の実装

### 2.1 Google Cloud Consoleでの設定

1. プロジェクト作成
2. Gmail API有効化
3. OAuth 2.0クライアントID作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクトURI: 
     - `http://localhost:3000/api/auth/callback/google`（開発）
     - `https://yourdomain.com/api/auth/callback/google`（本番）
4. クライアントIDとシークレットを取得

### 2.2 NextAuth.js設定

`src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.userId = token.sub as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

`src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

### 2.3 Vercel KV操作関数の実装

`src/lib/kv.ts`:

```typescript
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
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  } as UserData;

  await kv.set(key, updated);
}

// ユーザー情報を取得
export async function getUserData(userId: string): Promise<UserData | null> {
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
export async function getPendingMemos(userId: string): Promise<Map<string, PendingMemo>> {
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
```

### 2.4 ミドルウェアで認証チェック

`src/middleware.ts`:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  const isSetupPage = req.nextUrl.pathname.startsWith("/setup");

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 2.5 ログイン画面の実装

`src/app/(auth)/login/page.tsx`:

```typescript
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Keep Quick Memo
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Google Keepに素早くメモを送信
          </p>
        </div>
        
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/setup" });
          }}
        >
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Googleでログイン
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 2.6 セットアップ画面の実装

`src/app/(auth)/setup/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [keepEmail, setKeepEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/settings/keep-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepEmailAddress: keepEmail }),
      });

      if (!res.ok) throw new Error("保存に失敗しました");

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">初期設定</h2>
          <p className="mt-2 text-sm text-gray-600">
            Google Keepのメールアドレスを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="keep-email" className="block text-sm font-medium text-gray-700">
              Keep用メールアドレス
            </label>
            <input
              id="keep-email"
              type="email"
              required
              value={keepEmail}
              onChange={(e) => setKeepEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="xxxxx@keep.google.com"
            />
            <p className="mt-2 text-xs text-gray-500">
              Google Keepの設定から取得できます
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? "保存中..." : "保存して開始"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Phase 3: メモ送信機能の実装

### 3.1 Gmail API操作関数の実装

`src/lib/gmail.ts`:

```typescript
import { google } from "googleapis";

export async function sendMemoToKeep(
  accessToken: string,
  toEmail: string,
  content: string
): Promise<void> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // RFC 2822形式のメールを作成
  const message = [
    `To: ${toEmail}`,
    "Subject: ",
    "Content-Type: text/plain; charset=utf-8",
    "",
    content,
  ].join("\n");

  // Base64エンコード
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    accessToken: credentials.access_token!,
    expiresAt: credentials.expiry_date!,
  };
}
```

### 3.2 メモ送信APIの実装

`src/app/api/memo/send/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { getUserData, saveUserData, savePendingMemo } from "@/lib/kv";
import { sendMemoToKeep, refreshAccessToken } from "@/lib/gmail";
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

    const { content } = await request.json();
    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "メモが空です" },
        { status: 400 }
      );
    }

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

    // 即座にレスポンスを返す（非同期処理）
    const response = NextResponse.json({
      success: true,
      message: "メモを送信中です",
    });

    // バックグラウンドで送信処理
    (async () => {
      try {
        let accessToken = userData.accessToken;

        // トークンの有効期限チェック
        if (Date.now() >= userData.tokenExpiry) {
          const refreshed = await refreshAccessToken(userData.refreshToken);
          accessToken = refreshed.accessToken;
          await saveUserData(session.userId, {
            accessToken: refreshed.accessToken,
            tokenExpiry: refreshed.expiresAt,
          });
        }

        await sendMemoToKeep(
          accessToken,
          userData.keepEmailAddress,
          content
        );
      } catch (error) {
        console.error("メモ送信エラー:", error);
        // 失敗したメモを保存
        await savePendingMemo(session.userId, content);
      }
    })();

    return response;
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
```

### 3.3 設定API の実装

`src/app/api/settings/route.ts`:

```typescript
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
      return NextResponse.json(
        { success: false, error: "ユーザー情報が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: userData.email,
        keepEmailAddress: userData.keepEmailAddress,
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
```

`src/app/api/settings/keep-email/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { updateKeepEmail } from "@/lib/kv";
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

    const { keepEmailAddress } = await request.json();
    
    // バリデーション
    if (!keepEmailAddress || !keepEmailAddress.includes("@keep.google.com")) {
      return NextResponse.json(
        { success: false, error: "有効なKeep用メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    await updateKeepEmail(session.userId, keepEmailAddress);

    return NextResponse.json({
      success: true,
      keepEmailAddress,
    });
  } catch (error) {
    console.error("API エラー:", error);
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
```

### 3.4 メモ入力画面の実装

`src/app/(main)/page.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { SendStatus } from "@/types";

export default function HomePage() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 起動時に自動フォーカス
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!content.trim()) return;

    setStatus("sending");

    try {
      const res = await fetch("/api/memo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("送信に失敗しました");

      setStatus("success");
      setContent("");
      textareaRef.current?.focus();

      // 1秒後にステータスをリセット
      setTimeout(() => setStatus("idle"), 1000);
    } catch (error) {
      setStatus("error");
      console.error(error);

      // 3秒後にステータスをリセット
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">Quick Memo</h1>
        <a href="/settings" className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </header>

      <main className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メモを入力..."
          className="w-full h-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </main>

      <footer className="bg-white border-t p-4">
        <button
          onClick={handleSend}
          disabled={!content.trim() || status === "sending"}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "sending" && (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {status === "success" && (
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === "error" && (
            <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>
            {status === "sending" ? "送信中..." : "送信"}
          </span>
        </button>
      </footer>
    </div>
  );
}
```

---

## Phase 4: オフライン対応とPWA化

### 4.1 IndexedDB操作関数の実装

`src/lib/indexeddb.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { LocalMemo } from "@/types";

interface MemoDB extends DBSchema {
  pendingMemos: {
    key: string;
    value: LocalMemo;
    indexes: { "by-synced": boolean };
  };
}

let dbPromise: Promise<IDBPDatabase<MemoDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MemoDB>("keep-quick-memo", 1, {
      upgrade(db) {
        const store = db.createObjectStore("pendingMemos", { keyPath: "id" });
        store.createIndex("by-synced", "synced");
      },
    });
  }
  return dbPromise;
}

export async function saveMemoLocally(content: string): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const memo: LocalMemo = {
    id,
    content,
    createdAt: Date.now(),
    synced: false,
  };
  await db.add("pendingMemos", memo);
  return id;
}

export async function getUnsyncedMemos(): Promise<LocalMemo[]> {
  const db = await getDB();
  return await db.getAllFromIndex("pendingMemos", "by-synced", false);
}

export async function markMemoAsSynced(id: string): Promise<void> {
  const db = await getDB();
  const memo = await db.get("pendingMemos", id);
  if (memo) {
    memo.synced = true;
    await db.put("pendingMemos", memo);
  }
}

export async function deleteMemo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingMemos", id);
}
```

### 4.2 オフライン検知フックの実装

`src/hooks/useOnlineStatus.ts`:

```typescript
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

### 4.3 PWA設定

`next.config.js`:

```javascript
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  // 他のNext.js設定
});
```

`public/manifest.json`:

```json
{
  "name": "Keep Quick Memo",
  "short_name": "QuickMemo",
  "description": "Google Keepに素早くメモを送信",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

`src/app/layout.tsx` にmanifestリンクを追加:

```typescript
export const metadata = {
  title: "Keep Quick Memo",
  description: "Google Keepに素早くメモを送信",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};
```

### 4.4 オフライン同期機能の実装

メモ入力画面にオフライン対応を追加:

```typescript
// useOnlineStatusフックを使用
const isOnline = useOnlineStatus();

// オフライン時の保存処理
const handleSendOffline = async () => {
  await saveMemoLocally(content);
  setContent("");
  // トースト通知: "オフラインで保存しました"
};

// オンライン復帰時の同期
useEffect(() => {
  if (isOnline) {
    syncUnsyncedMemos();
  }
}, [isOnline]);

async function syncUnsyncedMemos() {
  const memos = await getUnsyncedMemos();
  for (const memo of memos) {
    try {
      await fetch("/api/memo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: memo.content }),
      });
      await markMemoAsSynced(memo.id);
    } catch (error) {
      console.error("同期エラー:", error);
    }
  }
}
```

---

## Phase 5: UI/UX最適化とテスト

### 5.1 レスポンシブデザインの最適化

Tailwind CSSでiPhone向け最適化:

```typescript
// セーフエリア対応
<div className="pb-safe">
  {/* コンテンツ */}
</div>

// キーボード表示時の調整
<textarea 
  className="h-[calc(100vh-200px)]"
  // viewport heightからヘッダー・フッターを引く
/>
```

`tailwind.config.ts` でカスタムユーティリティ追加:

```typescript
module.exports = {
  theme: {
    extend: {
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
    },
  },
};
```

### 5.2 ダークモード対応

Tailwind CSSのdark:クラスを使用:

```typescript
<div className="bg-white dark:bg-gray-900">
  <textarea className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
</div>
```

`src/app/layout.tsx` でシステム設定を検知:

```typescript
<html lang="ja" className="dark">
```

### 5.3 パフォーマンス最適化

- Dynamic importでコード分割
- 画像の最適化（next/image使用）
- フォントの最適化（next/font使用）
- Service Workerでリソースキャッシュ

### 5.4 テスト

手動テスト項目:
- ログイン・ログアウト
- メモ送信（オンライン）
- メモ送信（オフライン → オンライン復帰）
- Keep用メールアドレス変更
- PWAとしてホーム画面に追加
- ダークモード切り替え
- 各種エラーハンドリング

---

## Phase 6: デプロイと本番環境設定

### 6.1 Vercelへのデプロイ

```bash
# Vercel CLIインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

### 6.2 環境変数の設定

Vercelダッシュボードで設定:
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Vercel KVは自動設定される

### 6.3 Vercel KVのセットアップ

1. Vercelプロジェクトダッシュボード
2. Storage → Create Database → KV
3. 環境変数が自動で設定される

### 6.4 Google Cloud Consoleの本番設定更新

- 承認済みリダイレクトURIに本番URLを追加
- 本番ドメインを承認済みJavaScript生成元に追加

### 6.5 動作確認

- 本番環境でログイン
- メモ送信
- PWAインストール
- オフライン動作

---

## トラブルシューティング

### 問題1: トークンリフレッシュエラー
- 原因: リフレッシュトークンの期限切れ
- 対策: ユーザーに再ログインを促す

### 問題2: メール送信失敗
- 原因: Gmail APIのレート制限
- 対策: リトライ処理の実装、exponential backoff

### 問題3: PWAがインストールできない
- 原因: manifest.json or Service Workerの設定ミス
- 対策: Chrome DevToolsでLighthouseを実行して確認

### 問題4: Vercel KV接続エラー
- 原因: 環境変数の設定ミス
- 対策: Vercelダッシュボードで環境変数を確認

---

## 次のステップ（将来的な拡張）

1. 音声入力対応
2. 画像添付機能
3. タグ機能（件名に特定フォーマット）
4. 定型文テンプレート
5. 送信履歴の実装
6. iOS ショートカットアプリ連携
7. Android版最適化

---

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Gmail API Reference](https://developers.google.com/gmail/api)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
