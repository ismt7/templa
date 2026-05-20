# ビルドステージ
FROM node:26-alpine AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# npm キャッシュをマウントして依存関係をインストール
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# 本番ステージ
FROM node:26-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# セキュリティ: 非rootユーザーを作成
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser

# standalone ビルドの成果物のみコピー（node_modules 全体が不要）
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static

# 非rootユーザーに切り替え
USER appuser

# ポート公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# standalone サーバーで起動
CMD ["node", "server.js"]
