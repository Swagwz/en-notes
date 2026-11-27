# 開發與驗證

## 需求與本機設定

- 使用根目錄 `package.json` 宣告的 Node.js 與 pnpm 版本。
- D1 binding 名稱與 Cloudflare Database ID 設定於 [`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc)；`.dev.vars` 僅放本機環境變數，不放 D1 ID。執行 remote migrations 前，需先用 Wrangler 登入 Cloudflare 或設定 `CLOUDFLARE_API_TOKEN`，並確認目標 D1。
- 複製 [`apps/api/.dev.vars.example`](../apps/api/.dev.vars.example) 為 `apps/api/.dev.vars`，設定本機 Better Auth secret、bootstrap secret、管理者 email；需要字典查詢時再設定 Webster API key。
- `.dev.vars` 不應提交；它已列在 `.gitignore`。

## 常用命令

| 命令                                            | 說明                                                |
| ----------------------------------------------- | --------------------------------------------------- |
| `pnpm install`                                  | 安裝 workspace dependencies                         |
| `pnpm run dev`                                  | 平行啟動 web 與 API                                 |
| `pnpm --filter @en-notes/api dev`               | 套用本機 D1 migrations 並啟動 Worker（預設 8787）   |
| `pnpm --filter @en-notes/api db:migrate:local`  | 套用本機 D1 migrations                              |
| `pnpm --filter @en-notes/api db:migrate:remote` | 套用 Cloudflare remote D1 migrations；先確認目標 DB |
| `pnpm --filter @en-notes/api db:generate`       | 從 Drizzle schema 產生 D1 SQL migration             |
| `pnpm --filter @en-notes/api db:check`          | 檢查 Drizzle migration snapshot 衝突                |
| `pnpm --filter @en-notes/api typecheck`         | API TypeScript 檢查                                 |
| `pnpm --filter @en-notes/api build`             | Wrangler deploy dry-run bundle                      |
| `pnpm lint`                                     | Monorepo Oxlint                                     |
| `pnpm typecheck`                                | Workspace typecheck                                 |
| `pnpm check`                                    | format、lint、typecheck 與 test                     |

Web 使用 Vite，預設 port 4173；若占用，Vite 會選下一個可用 port。`pnpm dev` 會只在本機 Worker 設定 `API_DOCS_ENABLED=true`，因此 API docs 位於 `http://localhost:8787/api/v1/docs`；Production 未設定此值時 docs/spec 回 404。

## 本機 API 初始管理者

本機 D1 為空時，呼叫：

```sh
curl -X POST http://localhost:8787/api/v1/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: <BOOTSTRAP_SECRET>" \
  -d "{\"name\":\"Admin\",\"password\":\"<至少 12 字元密碼>\"}"
```

登入為 `POST /api/v1/sessions`；用戶端需保存 Better Auth session cookie。Swagger 與 spec 分別在 `/api/v1/docs` 和 `/api/v1/openapi.json`。

## Wrangler 本機狀態

API 的 scripts 透過 [`apps/api/scripts/wrangler.mjs`](../apps/api/scripts/wrangler.mjs) 呼叫 Wrangler。Windows workspace 若路徑含非 ASCII 字元，local D1 persistence 會改放系統 temp 的 `en-notes-api-d1` 目錄，避免 SQLite `SQLITE_CANTOPEN`；ASCII 路徑則使用 `apps/api/.wrangler/state`。要重置本機資料庫時，先停止 Worker，再檢查並刪除對應的 local state directory。
