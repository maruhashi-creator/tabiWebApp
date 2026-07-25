# DEVELOPMENT LOG

たびくんの健康管理アプリ（tabiWebApp）の開発記録。

---

## ブランチ運用

- 開発は `develop` ブランチで行う
- 機能単位でコミット
- `main` へは明示的に指示があったときのみマージ・プッシュ

---

## 主な変更履歴

### 導線検証(nav-check)で見つかった遷移不具合の修正

- **ログイン後に元ページへ戻る**: `middleware.ts` を `withAuth({ pages: { signIn: "/login" } })` に変更し、未ログイン時に `/api/auth/signin` を経由せず直接 `/login?callbackUrl=<相対パス>` へ飛ばす（従来は2段リダイレクト＋callbackUrl のホストが `localhost:3000` 固定になる問題があった）。`app/login/page.tsx` に `safeCallbackUrl()`（同一オリジンの相対パスのみ許可＝オープンリダイレクト対策）を追加し、ログイン/ゲストログイン成功時にそこへ戻す。新規登録は従来どおり `/settings`。
- **BottomNav の現在地**: `/feeding` `/toilet` `/weight` `/medication` 滞在中も「記録」タブがハイライトされるよう `RECORD_PATHS` で判定（`components/BottomNav.tsx`）。
- **`/graph` の空状態**: 猫未登録時に他画面と同様 `NoCatNotice` を表示（従来はフォールバック表示のみだった）。

### ケアの間隔を設定で変更可能に

「定期ケア」「環境メンテ」の各項目の間隔（◯日ごと）を猫ごとに設定できるようにした。

- **スキーマ**: `Cat` に `careCycles Json?`（nullable）を追加。項目名→日数のマップ。`prisma db push` で本番 Neon DB に列追加（additive）。
- **新規:** `lib/care.ts`。ケア項目リスト・既定間隔・`resolveCycle()`（保存値 > 既定）・設定可能グループを集約。記録画面と設定画面で共有（従来 `record/page.tsx` にハードコードしていた `CARE_GROUPS` を移設）。
- **`/api/cat`**: POST/PATCH で `careCycles` を受け取り、`sanitizeCareCycles()` で 1〜365 の整数のみ通す。
- **設定画面**: 「アカウント」の上に「ケアの間隔」ボックスを追加。定期ケア4項目・環境メンテ3項目を「◯日ごと」で編集し保存。
- **記録画面**: ケアタブが `cat.careCycles` を反映。定期ケア項目も間隔設定により「次回◯月◯日」表示になる。

### UX レビュー「軽微」項目の対応

`docs/ux-review-2026-07-21.md` の「軽微」を一括対応。

- **アクセシビリティ**
  - `text-stone-300` → `text-stone-400`、操作可能な ×/✏/ログアウトは `text-stone-500` に引き上げ
  - タップ領域を 44px に拡大。ケアの `+` だけは見た目 32px を保つため `after:-inset-1.5` で当たり判定のみ拡張
  - `userScalable: false` を撤去。あわせて `layout.tsx` のインラインスクリプト（2本指 touchmove の `preventDefault`、focusout での `user-scalable=no` 再設定）も削除（残すと設定変更が無効化されるため）。iOS のズーム暴発は `globals.css` の `font-size: 16px !important` で引き続き防ぐ
  - 数値入力に `inputMode`（量・回数は `numeric`、体重は `decimal`）を付与
- **PWA / レイアウト**
  - `mobile-web-app-capable` を併記して deprecated 警告を解消
  - `metadata.viewport` では `viewportFit` が出力されなかったため `export const viewport: Viewport` に分離し `viewport-fit=cover` を設定。`globals.css` に `.safe-area-pb` を実装
- **文言**
  - **新規:** `lib/messages.ts`。`MESSAGES` 内の「たび」を `{name}` プレースホルダに置換し `withCatName()` で差し込む。`replaceAll("たび", ...)` は猫の名前に「たび」が含まれると文言が壊れるため廃止。フォールバックは `DEFAULT_CAT_NAME = "ねこ"` に統一
  - API のエラーメッセージ（`Unauthorized` / `Forbidden` / `catId, amount, fedAt は必須です` など）をユーザー向けの日本語に統一。UI が `d.error` をそのまま表示するため
  - ホームのアラート「食餌量が…」→「ごはんの量が…」
- **グラフ**: 食事量を種類別の積み上げ棒に変更し凡例を追加。ml と g を同じ軸に積む点は解消できないため注記を添えて Y軸表記を「g / ml」に
- **削除**: `/api/anomaly`（参照0件。異常検知は `/api/home` 内に実装済みで二重管理だった）

未対応: `btn-primary` の白文字 on `#F69F9A`（2.03:1）は WCAG AA 未達のまま。トイレ種別の文字ラベルは方針として見送り。

---

### ホーム画面の挨拶・見出しを猫の名前で動的化

`app/page.tsx` で固定値 `たび` になっていた箇所を、登録された猫の名前 (`cat.name`) で表示するように修正。

- `greeting()` を引数 `name` を受け取る形に変更し、朝・昼の挨拶を動的化
- タイムラインの見出し `今日のたび` → `今日の{cat.name}`

アプリ名 (`たびの健康手帳`) やシードデータはそのまま。

---

### セキュリティ: API ルートの catId 所有権チェック

全ログ API (weight / feeding / toilet / medication / care) の GET・POST で、リクエストの `catId` がログインユーザーの猫かどうかを検証していなかった問題を修正。

- **新規:** `lib/cat-auth.ts` に `guardCatOwnership(catId, userId)` ヘルパーを追加
  - `catId` が未指定 → 400
  - 別ユーザーの猫 → 403
- 各 API ルートの GET・POST 冒頭でヘルパーを呼び出す形に統一
- `/api/cat` PATCH は既存の Prisma `where` 句で所有権チェック済みだったが、マッチしない場合に 500 を返していた → P2025 を 403 に変換

---

### ボトムナビゲーション再設計

**変更前:** ホーム / ごはん / トイレ / 体重 / お薬  
**変更後:** ホーム / 記録 / グラフ / カレンダー / 設定

記録系をすべて `/record` の1ページに集約し、分析・履歴系のページをナビに配置する構成に変更。

---

### 新規ページ

#### `/record` — 統合記録フォーム
- タブ切り替え：ごはん / トイレ / 体重 / お薬 / ケア
- 記録後はホームへ遷移せず同ページにとどまる（リセット）
- 給餌量プリセットは食種ごとに異なる
  - ミルク: 5ml / 10ml / 15ml（3列グリッド）
  - おやつ: 2g / 5g / 10g（3列グリッド）
  - その他: 5g / 10g / 15g / 20g（4列グリッド）
- プリセット3個のときは `grid-cols-3` で幅100%/3を使用

#### `/graph` — グラフ
- 体重推移：SVG polyline（直近20件）
- 給餌量推移：SVG bar chart（30日間の日別合計）
- 外部ライブラリなし、純SVGで実装

#### `/calendar` — カレンダー
- 月表示、記録のある日にカラードット表示
  - ピンク: ごはん / スカイ: トイレ / エメラルド: 体重 / バイオレット: お薬 / アンバー: ケア
- 日付タップで当日の記録詳細をボトムシートに表示

#### `/settings` — 設定
- たびくんのプロフィール編集（名前・品種・誕生日）
- PATCH `/api/cat` を呼び出して保存
- ログアウトボタン

---

### ケアタブ（CareLog）

10種類のケア項目を3カテゴリに分類：

| カテゴリ | 項目 |
|---|---|
| 日々のケア | おもちゃ遊び、爪切り、歯磨き、ブラッシング |
| 定期ケア | シャンプー、ノミ・ダニ予防、爪バリバリ交換 |
| 環境ケア | 猫砂掃除（25日サイクル）、水交換（7日）、トイレシート交換（4日） |

環境ケアの3項目は経過日数がサイクルを超えると警告表示。

Prismaに `CareLog` モデルを追加し `prisma db push` 済み。

---

### ホーム画面のアラート表示

- 複数アラートがある場合、1件ずつフェードイン・フェードアウトで切り替え
- 切り替え間隔: 4秒 / フェード時間: 700ms
- ドットインジケーターで現在位置を表示

アラートメッセージ一覧：
- 体重に変化があるかも
- おしっこの回数が少ないかも
- まだおしっこの記録がないよ
- 食餌量が平均より少ないかも
- まだごはんの記録がないよ

---

### バグ修正

#### ホームページが読み込み中から進まない
- **原因:** `load` 関数に try/catch がなく、`fetch("/api/cat")` が失敗すると `setLoading(false)` が呼ばれないままになっていた
- **修正:** `load` 関数全体を `try { } finally { setLoading(false); setRefreshing(false); }` で包んだ

#### `TypeError: Failed to fetch` （recordページ等）
- **原因:** `/api/cat` への fetch に `.catch()` がなく、ネットワークエラー時にページがクラッシュしていた
- **修正:** 全ページの `/api/cat` fetch に `.catch(() => {})` を追加

### 各ページのローディング

データ取得中は `<div className="min-h-screen bg-[#F7F5F2]" />` で空白表示。絵文字などは使用していない。

---

### ホーム画面のごはん表示にメモを反映

- `FeedingLog` インターフェースに `note` フィールドを追加
- ラベル表示を `${foodType} ${note} ${amount}g` の形式に変更
- メモが空のときは従来通り `その他 5g` のように表示

#### ごはんフォームのメモ欄プレースホルダー変更

- 「その他」選択時のみ `placeholder` を「絵文字を入力 🥦 🍠 🐓 🐟️ など」に変更
- その他の種類では「完食、残しあり など」のまま

---

### 新規ユーザー登録

ログインページにタブ切り替え（ログイン / 新規登録）を追加。

- `/api/register` POST: name / email / password を受け取りアカウント作成（bcrypt ハッシュ）
- メール重複・6文字未満パスワードはエラー返却
- 登録後は自動ログインし `/settings`（猫の登録フォーム）へ遷移
- ゲストログインはログインタブのみ表示
- メール認証なし（家族・知人限定の小規模利用のため）

---

### マルチユーザー対応（Cat-User 多対多）

複数ユーザーが異なる猫のデータを管理できるよう、`Cat` と `User` の間に多対多リレーションを追加。

- **スキーマ変更:** `prisma/schema.prisma` に `Cat.users User[]` / `User.cats Cat[]` を追加し、`prisma db push` 済み
- **既存データ移行:** seed 実行により既存3ユーザー（おとうさん・おかあさん・ゲスト）をたびに connect
- **`/api/cat` GET:** `users: { some: { id: session.user.id } }` でログインユーザーの猫のみ返す
- **`/api/cat` POST:** 新規猫作成エンドポイントを追加。作成時にログインユーザーを connect
- **`/api/home` GET:** `cat.findFirst` をユーザーフィルタ付きに変更
- **`/settings` ページ:** 猫が未登録の新規ユーザーは猫作成フォームとして動作（POST）。登録済みは従来通り編集（PATCH）

**ユーザー分離のしくみ:**
- 既存ユーザー（たびくんの家族）→ たびのデータのみ表示
- 新規ユーザー（実家の父・母）→ 設定画面でむぎを登録 → むぎのデータのみ表示

### ホームのみフェードアウト・フェードイン

`app/template.tsx` を使用。ホームページ（`/`）のみに適用。他のページは素通り。

- **フェードイン**: マウント時に opacity 0 → 1（250ms ease）
- **フェードアウト**: BottomNav のボタンクリック時に `page-exit` イベントを発火 → opacity 1 → 0 → 250ms後に `router.push()`
- BottomNav 自体は `layout.tsx` に属するため遷移中も固定表示のまま

---

## API一覧

| エンドポイント | メソッド | 概要 |
|---|---|---|
| `/api/cat` | GET | ログインユーザーの猫一覧取得 |
| `/api/cat` | POST | 猫新規作成（ログインユーザーに紐付け） |
| `/api/cat` | PATCH | プロフィール更新・ケア間隔（careCycles）更新 |
| `/api/feeding` | GET / POST | 給餌ログ |
| `/api/toilet` | GET / POST | トイレログ |
| `/api/weight` | GET / POST | 体重ログ |
| `/api/medication` | GET / POST | 投薬ログ |
| `/api/care` | GET / POST | ケアログ |
| `/api/register` | POST | 新規ユーザー登録 |

`/api/feeding`, `/api/toilet`, `/api/care` はクエリパラメータ `from` / `to` による日付範囲絞り込みに対応。

---

### 約物半角フォント（Yaku Han JP）導入

`font-feature-settings: "palt"` の代わりに、約物専用フォント「Yaku Han JP」を CDN（jsDelivr）で導入。

- `layout.tsx` の `<head>` に jsDelivr の CSS リンクを追加
- `Inter` を CSS 変数（`--font-inter`）として定義し直し
- `globals.css` の `body` に `font-family: "YakuHanJP", var(--font-inter), sans-serif` を設定

---

## 技術スタック

- Next.js 14 App Router
- Prisma + PostgreSQL（Neon）
- NextAuth（Google OAuth）
- Tailwind CSS
- date-fns
- Vercel（デプロイ先）
