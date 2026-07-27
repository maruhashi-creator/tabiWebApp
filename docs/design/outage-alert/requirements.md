# 停電アラート機能 要件定義書

作成日: 2026-07-28 / 対象: tabiWebApp（たびくんの健康管理アプリ）

## 1. 目的・背景

飼い主が不在時でも、自宅エリアの停電をいち早く知り、ペット（たびくん）の生活環境（空調・給餌器・見守りカメラ等）への影響に対処できるようにする。設定した郵便番号のエリアで停電が発生したら、登録端末へプッシュ通知する。

## 2. スコープ

### 対象（MVP）
- 設定画面での郵便番号（7桁）登録と「停電アラート」ON/OFF
- Web Push（PWA前提）による通知購読の登録・解除
- 定期チェック（Vercel Cron）→ 新規停電の検出 → 該当ユーザーへプッシュ送信
- 停電判定は**モック実装**（差し替え可能なインターフェース）。手動シミュレートで全経路を検証可能にする

### 対象外（今回やらない）
- 実データ連携（電力会社API/停電情報の実取得）※後続で差し込む
- 復旧通知（発生時のみ通知する方針）
- 丁目レベルのピンポイント判定（市区町村単位まで）
- iOS 未インストール（ホーム画面未追加）への通知手段（メール/SMS 等の代替）

## 3. 前提・確定した方針（2026-07-28 合意）

| 論点 | 決定 |
|---|---|
| 停電データ取得元 | **まずモックで仕組みを構築**。判定は差し替え可能なインターフェースにし、実データは後で接続 |
| 通知方式 | **Web Push（PWA前提）**。Service Worker + VAPID |
| 復旧通知 | **発生時のみ**（復旧は通知しない） |

### iOS の制約（重要）
Web Push は iOS では「ホーム画面に追加した PWA（iOS 16.4 以降）」でのみ受信可能。ブラウザのまま／未インストールでは通知は届かない。Android/PC の Chrome 等は通常のブラウザで受信可。この制約は設定画面で明示する。

## 4. 機能要件

### FR-1 郵便番号の登録
- 設定画面「アカウント」の上に「停電アラート」ボックスを新設
- 7桁の郵便番号を入力（ハイフン有無を許容し、内部は数字7桁に正規化）
- バリデーション: 数字7桁。不正時はユーザー向けメッセージ

### FR-2 アラートON/OFF と購読
- トグルON時: ブラウザに通知許可を要求 → Push 購読を作成 → サーバ保存。許可拒否時はトグルを戻し理由を表示
- トグルOFF時: 当該端末の購読を削除（サーバからも削除）
- 端末ごとに購読が別（複数端末で受信可能）

### FR-3 停電の検出と通知
- Vercel Cron が定期（既定: 5分毎）に `/api/cron/outage` を起動（`CRON_SECRET` で保護）
- アラートON かつ 郵便番号登録済みのユーザーを対象に、エリアの停電状態を判定
- **新規発生時のみ**通知（前回状態と比較。既に停電中のエリアは再通知しない）
- 通知文例: 「⚡ お住まいのエリア（◯◯市）で停電が発生しています」。タップでアプリ（または停電情報ページ）を開く
- 無効化された購読（410/404）はサーバから自動削除

### FR-4 手動シミュレート（検証用）
- モック期間中の動作確認のため、認可済みで特定エリアを「停電中」として流し込める経路を用意（例: `/api/cron/outage` に `simulate` パラメータ、または dev 限定エンドポイント）
- 本番の通常運転ではモックは常に「停電なし」を返す

## 5. 非機能要件

- **セキュリティ**: cron エンドポイントは `CRON_SECRET` 必須。VAPID 秘密鍵・CRON_SECRET は環境変数管理（コミットしない）。オープンリダイレクト等の対象なし
- **プライバシー**: 郵便番号は個人の所在に関わる情報。ユーザー本人のみ参照・更新可（`session.user.id` で制限）
- **多重通知防止**: `OutageState` で「エリア×最終状態」を保持し、発生の立ち上がり（false→true）でのみ送信
- **障害耐性**: 停電データ取得や送信の失敗が cron 全体を落とさない（try/catch、部分失敗を許容）
- **既存方針の踏襲**: エラーメッセージはユーザー向け日本語、型チェック（tsc）通過、develop→main 運用

## 6. データモデル（Prisma 追加）

```prisma
model User {
  // 既存に追加
  zipcode           String?
  outageAlert       Boolean            @default(false)
  pushSubscriptions PushSubscription[]
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

// 新規発生判定のためのエリア状態（areaKey = 正規化郵便番号 or 市区町村キー）
model OutageState {
  areaKey   String   @id
  active    Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

- 追加は additive（nullable 列 + 新規テーブル）。本番反映は `prisma db push`（要承認）

## 7. API 設計

| エンドポイント | メソッド | 概要 | 認可 |
|---|---|---|---|
| `/api/push/subscribe` | POST | 端末の Push 購読を保存 | ログイン必須 |
| `/api/push/subscribe` | DELETE | 端末の購読を削除 | ログイン必須 |
| `/api/user/outage` | GET | 郵便番号・アラート状態の取得 | 本人のみ |
| `/api/user/outage` | PATCH | 郵便番号・アラートON/OFF更新 | 本人のみ |
| `/api/cron/outage` | POST | 停電チェック→新規発生に通知 | `CRON_SECRET` |

- レスポンス/エラーは既存 API と同様、ユーザー向け日本語メッセージ

## 8. 通知フロー

```
Vercel Cron (5分毎)
  → POST /api/cron/outage (Authorization: Bearer CRON_SECRET)
    → 対象ユーザー（outageAlert=true & zipcode）を取得
    → lib/outage: fetchActiveOutageAreas()  … モック（既定: 空）
    → 各ユーザーの areaKey を照合
      → OutageState と比較し false→true のエリアのみ「新規発生」
        → そのユーザーの全 PushSubscription へ web-push 送信
        → 無効購読(410/404)は削除
      → OutageState を更新
```

## 9. 外部依存・インフラ

- npm: `web-push`（`@types/web-push`）
- 環境変数（ローカル `.env.local` / 本番 Vercel に設定）
  - `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（同値）
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`（`mailto:` 連絡先）
  - `CRON_SECRET`
- `public/sw.js`（Service Worker: `push` / `notificationclick`）
- `vercel.json` に cron 定義（`/api/cron/outage`、5分毎）
- **本番稼働の前提**: 上記 env の Vercel 設定と Cron 有効化はデプロイ側の作業（ユーザー実施事項）

## 10. リスク・留意点

- **実データ源の不在**: 全国統一 API がなく、電力会社ごとに個別対応が必要。モック→実データ差し込み時に判定 IF の見直しが要る
- **iOS の受信制約**: ホーム画面追加 PWA 限定。未インストール層はカバーできない（要件外）
- **停電時の通知到達性**: 停電＝当該エリアの回線も落ちる可能性。あくまで「気づきの補助」で確実性は保証しない旨、UI/文言で過度な期待を持たせない
- **郵便番号→エリア変換**: モック段階では areaKey=正規化郵便番号で簡易照合。実データ接続時に市区町村マッピング（zipcloud 等）を導入

## 11. 受け入れ基準（テスト観点）

- [ ] 設定で郵便番号を保存でき、リロード後も反映される（本人のみ）
- [ ] アラートONで通知許可→購読がサーバ保存され、OFFで削除される
- [ ] `/api/cron/outage` を `CRON_SECRET` 無しで叩くと 401
- [ ] 手動シミュレートで対象エリアを停電にすると、該当ユーザーの購読端末へ通知が届く（実機 PWA で確認）
- [ ] 同一エリアが停電中のまま再実行しても再通知されない（新規発生のみ）
- [ ] 無効な購読は送信失敗時に自動削除される
- [ ] tsc 通過。既存導線・他機能に影響なし

## 12. 実装ステップ（合意後）

1. `web-push` 追加・VAPID 鍵/CRON_SECRET を `.env.local` 生成（本番は Vercel env）
2. スキーマ拡張 + `prisma db push`（要承認）
3. `lib/webpush.ts`（送信）・`lib/outage.ts`（モック判定＋新規検出＋送信オーケストレーション）
4. API: `/api/push/subscribe`・`/api/user/outage`・`/api/cron/outage`
5. `public/sw.js` + クライアント購読フロー
6. 設定画面に「停電アラート」ボックス（郵便番号＋トグル＋iOS注意書き）
7. `vercel.json` に cron 定義、型チェック・ローカル検証（手動シミュレート）
