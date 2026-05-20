# templa

テンプレートとプレースホルダーを使って、文章作成を効率化する支援ツールです。

## 概要

templa は、複数の文章テンプレートを管理しながら、プレースホルダーの値をシーンごとに切り替えて文章を作成できる Next.js アプリです。

主な用途:

- 定型文の使い回し
- 文脈ごとの文面差し替え
- JSONでのテンプレートの持ち運び

## 主な機能

### テンプレート管理

- テンプレートの追加・削除
- テンプレート名の編集
- 1テンプレート内で複数テキストエリアを管理

### プレースホルダー機能

- `{顧客名}` のような記法でプレースホルダーを定義
- テンプレート本文からプレースホルダーを自動抽出
- プレースホルダーごとに入力種別を設定（テキスト / リスト / 日付）
- 日付プレースホルダーは表示形式を任意指定可能（例: `YYYY-MM-DD` / `YYYY/MM/DD` / `YYYY年M月D日`）
- 日付フォーマットでは `YYYY` `YY` `MM` `M` `DD` `D` を利用可能

### シーン管理

- テンプレート内に複数シーンを保持
- シーン単位でプレースホルダー値を管理

### 入出力

- テンプレートを JSON でエクスポート
- JSON ファイルからインポート
- 生成文のクリップボードコピー

## セットアップ

### 必要環境

- Node.js 20 以上推奨
- npm

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いて確認します。

### Docker で利用する（GHCR）

GitHub Container Registry (GHCR) からイメージを取得して、ローカルで起動できます。

### docker run コマンド

```bash
docker run -d --rm --name templa -p 3000:3000 ghcr.io/ismt7/templa:latest
```

Apple Silicon (arm64) 環境で古い `latest` イメージを pull して `no matching manifest for linux/arm64/v8` が出る場合は、以下で起動できます。

```bash
docker run -d --rm --name templa --platform linux/amd64 -p 3000:3000 ghcr.io/ismt7/templa:latest
```

### Docker Compose 記載例

```yaml
services:
  app:
    image: ghcr.io/ismt7/templa:latest
    container_name: templa
    # arm64 イメージ未提供時の互換実行（必要な場合のみ有効化）
    # platform: linux/amd64
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Compose で起動:

```bash
docker compose up -d
```

Compose で停止:

```bash
docker compose down
```

### ビルド・起動

```bash
npm run build
npm run start
```

## 使い方

1. サイドメニューからテンプレートを追加する
2. テンプレート名と本文を入力する
3. 本文内に `{項目名}` 形式でプレースホルダーを書く
4. 必要に応じてプレースホルダー設定（テキスト/リスト/日付）を調整する
5. シーンごとに値を入力して、用途に応じて切り替える
6. コピー、または JSON エクスポートで利用する

## ディレクトリ構成

```text
app/
	components/
		EditTemplateModal.tsx
		Navbar.tsx
		SideMenu.tsx
	settings/
		page.tsx
	globals.css
	layout.tsx
	page.tsx
utils/
	localStorageUtils.ts
	placeholderUtils.ts
```

## 技術スタック

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Heroicons

## データ永続化

- テンプレートデータはブラウザの LocalStorage に保存されます。
- サーバー側のデータ保存は行いません。

## 制約

- LocalStorage ベースのため、ブラウザや端末を跨いだ自動同期はありません。
- 設定ページ（`/settings`）は現時点で未実装です。
