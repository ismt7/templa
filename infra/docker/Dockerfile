# ビルドステージ
FROM node:22-alpine AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# 依存関係をインストール（ビルドに必要なdevDependenciesを含む）
RUN npm ci

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# 実行に不要なdevDependenciesを削除
RUN npm prune --omit=dev && npm cache clean --force

# 本番ステージ
FROM node:22-alpine

WORKDIR /app

# セキュリティ: 非rootユーザーを作成
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser

# ビルドステージから成果物をコピー
COPY --from=builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# 非rootユーザーに切り替え
USER appuser

# ポート公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# アプリケーション起動
CMD ["node_modules/.bin/next", "start"]
