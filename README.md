# OneTapKeep

Google Keepに素早くメモを投稿するPWAアプリ。

## デプロイ手順

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **Gmail API** を有効化
3. **OAuth 2.0 クライアントID** を作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みリダイレクトURI:
     - `http://localhost:3000/api/auth/callback/google` (開発用)
     - `https://<your-domain>/api/auth/callback/google` (本番用)
4. クライアントIDとシークレットを控える

### 2. Vercel へのデプロイ

1. このリポジトリをGitHubにプッシュ
2. [Vercel](https://vercel.com) でプロジェクトをインポート
3. **Vercel Marketplace** から [Upstash Redis](https://vercel.com/marketplace/upstash) を追加
   - `KV_REST_API_URL` と `KV_REST_API_TOKEN` が自動設定される

### 3. Vercel 環境変数の設定

Vercel プロジェクトの Settings > Environment Variables に以下を追加:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `AUTH_SECRET` | `openssl rand -base64 32` で生成 | NextAuth暗号化キー |
| `GOOGLE_CLIENT_ID` | Google Cloud Console から | OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console から | OAuth クライアントシークレット |

> `KV_REST_API_URL` と `KV_REST_API_TOKEN` はUpstash Redisの追加時に自動設定されます。

### 4. デプロイ後の確認

1. 本番URLにアクセスしてログインが動作するか確認
2. Google Cloud Console で本番URLのリダイレクトURIを追加済みか確認
3. メモ送信 → Google Keepに反映されるか確認

## ローカル開発

```bash
cp .env.local.example .env.local
# .env.local に実際の値を設定
npm install
npm run dev
```
