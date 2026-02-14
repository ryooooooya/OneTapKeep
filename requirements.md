# Google Keep Quick Memo - 要件定義書

## プロジェクト概要

Google Keepに素早くメモを投稿するためのPWAアプリ。
iPhoneでの使用を想定し、最小限のUIで最速のメモ投稿体験を提供する。

## 目的

- メモを思いついた瞬間に即座に記録できる
- アプリ起動から投稿まで最小限のタップ数
- オフライン時も一時保存し、オンライン復帰時に自動送信

## ターゲットユーザー

- iPhoneユーザー
- Google Keepを日常的に使用している人
- 素早くメモを取りたい人

## 技術スタック

### フロントエンド
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- next-pwa（PWA対応）

### バックエンド
- Next.js API Routes
- NextAuth.js v5 (Google OAuth 2.0)
- Gmail API
- Vercel KV

### デプロイ
- Vercel

## 機能要件

### 1. 認証機能

#### 1.1 ログイン
- Googleアカウントでログイン
- OAuth 2.0による認証
- 必要な権限: `https://www.googleapis.com/auth/gmail.send`

#### 1.2 初回セットアップ
- ログイン後、Keep用メールアドレスの入力を促す
- メールアドレスのバリデーション
- 設定完了後、メモ入力画面へ遷移

#### 1.3 セッション管理
- NextAuth.js JWTセッション
- トークンの自動更新（リフレッシュトークン使用）
- セキュアなcookie設定（httpOnly, secure, sameSite）

### 2. メモ投稿機能

#### 2.1 メモ入力
- マルチラインテキストエリア
- 起動時に自動フォーカス
- プレースホルダー表示

#### 2.2 送信処理
- 送信ボタンをタップ
- Gmail API経由でKeep用アドレスにメール送信
- 件名: 空（Keepがタイトルを自動生成）
- 本文: 入力したテキスト

#### 2.3 送信後の動作
- テキストエリアを即座にクリア
- 次のメモ入力可能状態に
- 送信状態を視覚的にフィードバック
  - 送信中: 小さなスピナー
  - 成功: 緑のチェックマーク（1秒後に消える）
  - 失敗: 赤いエラーアイコン + トースト通知

#### 2.4 非同期送信
- API Routeは即座にレスポンス返却
- バックグラウンドでメール送信処理
- ユーザーは送信完了を待たずに次の操作可能

### 3. オフライン対応

#### 3.1 オフライン検知
- ブラウザのonline/offlineイベント監視
- オフライン時は送信ボタンの表示を変更

#### 3.2 一時保存
- IndexedDBに未送信メモを保存
- オンライン復帰時に自動送信
- 送信失敗時もIndexedDBに保存してリトライ

#### 3.3 Service Worker
- アプリシェルのキャッシュ
- 静的リソースのキャッシュ
- オフライン時もアプリ起動可能

### 4. 設定機能

#### 4.1 Keep用メールアドレス変更
- 設定画面で変更可能
- バリデーション実施
- Vercel KVに保存

#### 4.2 ログアウト
- セッション削除
- ログイン画面へリダイレクト

#### 4.3 送信履歴（オプション機能）
- 過去の送信メモを表示
- 送信日時、ステータス表示
- 再送信機能

## 非機能要件

### 1. パフォーマンス
- 初回起動: 2秒以内
- 2回目以降の起動: 1秒以内
- メモ送信のレスポンス: 200ms以内（API応答）
- テキスト入力の遅延: 知覚できないレベル

### 2. セキュリティ
- OAuth 2.0による安全な認証
- トークンはVercel KVに暗号化して保存
- クライアントサイドにトークンを渡さない
- HTTPS必須
- セキュアなcookie設定

### 3. ユーザビリティ
- iPhoneのセーフエリアを考慮
- ダークモード対応
- キーボード表示時もUIが隠れない
- ホーム画面に追加可能（PWA）
- ネイティブアプリのような操作感

### 4. 可用性
- オフライン時も操作可能
- 送信失敗時の自動リトライ
- エラーハンドリングの徹底

### 5. スケーラビリティ
- Vercelの無料枠で運用可能
- ユーザー数に応じた自動スケール
- Vercel KVの制限内での設計

## データ構造

### Vercel KV

#### ユーザー情報
```
キー: user:{googleUserId}
値: {
  email: string,
  keepEmailAddress: string,
  accessToken: string, // 暗号化
  refreshToken: string, // 暗号化
  tokenExpiry: number, // Unix timestamp
  createdAt: string,
  updatedAt: string
}
```

#### 未送信メモ（送信失敗時）
```
キー: pending:{userId}:{timestamp}
値: {
  content: string,
  retryCount: number,
  lastAttempt: number, // Unix timestamp
  error?: string
}
```

### IndexedDB（クライアント側）

#### 未送信メモ
```
ストア名: pendingMemos
構造: {
  id: string, // UUID
  content: string,
  createdAt: number, // Unix timestamp
  synced: boolean
}
```

## 画面構成

### 1. ログイン画面（/login）
- アプリ名・ロゴ
- 「Googleでログイン」ボタン
- シンプルな説明文

### 2. 初回セットアップ画面（/setup）
- Keep用メールアドレス入力フォーム
- バリデーションメッセージ
- 「保存して開始」ボタン
- Keep設定画面へのリンク（説明）

### 3. メモ入力画面（/ - メイン画面）
- 大きなテキストエリア（画面の大部分）
- 送信ボタン（下部固定）
- ステータスインジケーター（送信中・成功・失敗）
- 設定ボタン（右上、アイコンのみ）
- オフライン通知（該当時のみ表示）

### 4. 設定画面（/settings）
- Keep用メールアドレス変更
- ログアウトボタン
- 送信履歴へのリンク（オプション）
- アプリバージョン情報

### 5. 送信履歴画面（/history - オプション）
- 送信済みメモのリスト
- 各メモの送信日時、ステータス
- 再送信ボタン（失敗分のみ）

## API仕様

### POST /api/memo/send
メモを送信する

#### Request
```json
{
  "content": "メモの内容"
}
```

#### Response（成功）
```json
{
  "success": true,
  "message": "メモを送信しました"
}
```

#### Response（失敗）
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### PUT /api/settings/keep-email
Keep用メールアドレスを更新

#### Request
```json
{
  "keepEmailAddress": "user@keep.google.com"
}
```

#### Response（成功）
```json
{
  "success": true,
  "keepEmailAddress": "user@keep.google.com"
}
```

### GET /api/settings
現在の設定を取得

#### Response
```json
{
  "keepEmailAddress": "user@keep.google.com",
  "email": "user@gmail.com"
}
```

## Gmail API仕様

### メール送信フォーマット
- To: ユーザー設定のKeep用メールアドレス
- From: ユーザーのGmailアドレス
- Subject: （空）
- Body: メモの内容（プレーンテキスト）

### 使用するAPI
- `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
- Base64エンコードされたRFC 2822フォーマットのメール

## 制約事項

### Google Keep API非公開
- 公式のKeep APIは存在しない
- Gmail経由でのメール転送を利用
- Keepの高度な機能（ラベル、リマインダー等）は使用不可

### iOSのPWA制限
- プッシュ通知は制限あり（今回は不要）
- バックグラウンド同期に制限
- Safariエンジン依存

### Vercel制限
- 無料枠のファンクション実行時間: 10秒
- Vercel KV無料枠: 256MB、10万リクエスト/月

## 想定される課題と対策

### 課題1: メール送信の遅延
- 対策: 非同期処理、楽観的UI更新

### 課題2: Keep用メールアドレスの取得が煩雑
- 対策: セットアップ画面でわかりやすい説明を提供

### 課題3: オフライン時の同期忘れ
- 対策: Service Workerによる自動同期、未送信件数の表示

### 課題4: トークンの有効期限切れ
- 対策: リフレッシュトークンによる自動更新

## 今後の拡張性

### Phase 2（将来的に検討）
- 音声入力対応
- 画像添付機能（Gmail経由で添付ファイル送信）
- タグ機能（件名に特定フォーマットで記載）
- 定型文テンプレート
- ショートカットアプリ連携（iOS）
- Android版PWA最適化

## 参考情報

### Keep用メールアドレスの取得方法
1. Google Keepを開く
2. 設定を開く
3. 「メモとリストを追加」セクションを確認
4. 固有のメールアドレスが表示される

### 必要なGoogle Cloud設定
1. Google Cloud Consoleでプロジェクト作成
2. Gmail API有効化
3. OAuth 2.0クライアントID作成
4. 認証済みリダイレクトURIに`https://yourdomain.com/api/auth/callback/google`追加
