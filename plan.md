# OneTapKeep 開発計画書

## 概要

Google Keepに素早くメモを投稿するPWAアプリ「OneTapKeep」の開発計画。
要件定義書(`requirements.md`)と実装計画書(`implementation-plan.md`)に基づく。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| PWA | next-pwa, Service Worker, manifest.json |
| 認証 | NextAuth.js v5, Google OAuth 2.0 |
| API | Gmail API (RFC 2822), googleapis |
| ストレージ(サーバー) | Vercel KV (Redis) |
| ストレージ(クライアント) | IndexedDB (idb) |
| バリデーション | zod |
| 通知 | react-hot-toast |
| デプロイ | Vercel |

## ディレクトリ構成

```
OneTapKeep/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx        # ログイン画面
│   │   │   └── setup/page.tsx        # 初回セットアップ画面
│   │   ├── (main)/
│   │   │   ├── page.tsx              # メモ入力画面(メイン)
│   │   │   └── settings/page.tsx     # 設定画面
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── memo/send/route.ts
│   │   │   └── settings/
│   │   │       ├── route.ts          # GET settings
│   │   │       └── keep-email/route.ts # PUT keep-email
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── MemoInput.tsx
│   │   ├── SendButton.tsx
│   │   ├── StatusIndicator.tsx
│   │   ├── OfflineNotice.tsx
│   │   └── Providers.tsx
│   ├── hooks/
│   │   └── useOnlineStatus.ts
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth設定
│   │   ├── gmail.ts                  # Gmail API操作
│   │   ├── kv.ts                     # Vercel KV操作
│   │   ├── indexeddb.ts              # IndexedDB操作
│   │   └── validators.ts            # zodバリデーション
│   ├── types/
│   │   └── index.ts                  # 型定義
│   └── middleware.ts                 # 認証ミドルウェア
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 実装フェーズ

### Phase 1: プロジェクトセットアップと基盤構築

1. Next.js 14プロジェクト初期化 (TypeScript, ESLint, Tailwind, App Router, src/)
2. 依存パッケージインストール
   - next-auth@beta, @vercel/kv, googleapis, next-pwa(@ducanh2912/next-pwa), idb, zod, react-hot-toast
3. ディレクトリ構造作成
4. TypeScript型定義 (`src/types/index.ts`)
5. 環境変数テンプレート (`.env.local.example`)
6. NextAuth用の型拡張 (`src/types/next-auth.d.ts`)

### Phase 2: 認証機能の実装

1. NextAuth.js v5設定 (`src/lib/auth.ts`)
   - Googleプロバイダー設定 (Gmail API send scope含む)
   - JWT/セッションコールバック
   - トークン情報をVercel KVに保存
2. NextAuth APIルート (`src/app/api/auth/[...nextauth]/route.ts`)
3. Vercel KV操作関数 (`src/lib/kv.ts`)
   - saveUserData, getUserData, updateKeepEmail
   - savePendingMemo, getPendingMemos, deletePendingMemo
4. 認証ミドルウェア (`src/middleware.ts`)
   - 未認証ユーザー → /login リダイレクト
   - 認証済みユーザー → /login からリダイレクト
5. ログイン画面 (`src/app/(auth)/login/page.tsx`)
6. セットアップ画面 (`src/app/(auth)/setup/page.tsx`)
   - Keep用メールアドレス入力

### Phase 3: メモ送信機能の実装

1. Gmail API操作関数 (`src/lib/gmail.ts`)
   - sendMemoToKeep: RFC 2822形式メール作成・送信
   - refreshAccessToken: トークン自動更新
2. メモ送信API (`src/app/api/memo/send/route.ts`)
   - 認証チェック → バリデーション → 送信処理
   - トークン期限切れ時の自動リフレッシュ
3. 設定API
   - GET /api/settings (`src/app/api/settings/route.ts`)
   - PUT /api/settings/keep-email (`src/app/api/settings/keep-email/route.ts`)
4. zodバリデーション (`src/lib/validators.ts`)
5. メモ入力画面 (`src/app/(main)/page.tsx`)
   - テキストエリア (自動フォーカス)
   - 送信ボタン (ステータスインジケーター付き)
   - 設定リンク
6. 設定画面 (`src/app/(main)/settings/page.tsx`)
   - Keep用メールアドレス変更
   - ログアウト

### Phase 4: オフライン対応とPWA化

1. IndexedDB操作関数 (`src/lib/indexeddb.ts`)
   - saveMemoLocally, getUnsyncedMemos, markMemoAsSynced, deleteMemo
2. useOnlineStatusフック (`src/hooks/useOnlineStatus.ts`)
3. PWA設定
   - next.config.js (next-pwa統合)
   - public/manifest.json
   - PWAアイコン生成
4. メモ入力画面にオフライン対応追加
   - オフライン時: IndexedDBに保存
   - オンライン復帰時: 自動同期
5. OfflineNoticeコンポーネント
6. layout.tsxにPWAメタデータ追加

### Phase 5: UI/UX最適化

1. iPhoneセーフエリア対応 (env(safe-area-inset-*))
2. ダークモード対応 (Tailwind dark:クラス)
3. キーボード表示時のUI調整
4. パフォーマンス最適化
   - next/fontでフォント最適化
   - コンポーネント分割
5. react-hot-toastによるトースト通知
6. globals.cssの調整

## 注意事項

- 外部サービス(Google OAuth, Vercel KV, Gmail API)は実際のクレデンシャルが必要
- `.env.local.example`をテンプレートとして提供し、ユーザーが自分の値を設定できるようにする
- Phase 6(デプロイ)はユーザーが手動で実施する想定
- next-pwaは`@ducanh2912/next-pwa`（Next.js 14対応のメンテナンスされたフォーク）を使用
