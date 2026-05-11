# Docker 使用方法

このプロジェクトはDocker対応しており、ローカル開発環境と本番ビルドをコンテナで実行できます。

## 前提条件

- Docker
- Docker Compose

## ローカル開発環境での実行

### 方法1: Docker Composeを使用（推奨）

```bash
# コンテナのビルドと起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d --build
```

アプリケーションは `http://localhost:3000` でアクセス可能です。

### 方法2: Dockerコマンドで直接実行

```bash
# 開発イメージをビルド
docker build -f infra/docker/Dockerfile.dev -t templa:dev .

# コンテナを実行
docker run -it --rm -p 3000:3000 -v $(pwd):/app -v /app/node_modules templa:dev
```

## 本番ビルド

### イメージの作成

```bash
# 本番イメージをビルド（マルチステージビルド）
docker build -f infra/docker/Dockerfile -t templa:latest .
```

### コンテナの実行

```bash
# 本番イメージを実行
docker run -it --rm -p 3000:3000 templa:latest
```

## よく使うコマンド

```bash
# コンテナの停止
docker-compose down

# ログの確認
docker-compose logs -f

# 特定のサービスのみビルド
docker-compose build app

# ボリュームを含めて削除
docker-compose down -v

# 既存のイメージ・コンテナをクリーンアップ
docker system prune -a
```

## 環境変数

開発環境では `.env.local` ファイルを作成して環境変数を設定できます。

```env
# .env.local
NODE_ENV=development
```

## トラブルシューティング

### ポート3000が既に使われている場合

docker-compose.yml の `ports` セクションを修正：

```yaml
ports:
  - "3001:3000"  # ホストの3001番ポートをコンテナの3000番にマップ
```

### `node_modules` が古い場合

```bash
docker-compose down -v
docker-compose up --build
```

### キャッシュをクリアしてビルド

```bash
docker-compose build --no-cache
```

## パフォーマンスのヒント

- macOS/Windows: Docker Desktop の リソース設定を確認（CPU/メモリ割り当て）
- ボリュームマウント時は`.dockerignore` と `docker-compose.yml` の設定を確認
- 開発中は `Dockerfile.dev` を使用（npm moduleキャッシュを活用）
