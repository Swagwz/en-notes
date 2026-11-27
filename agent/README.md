# 專案文件索引

這些文件整理 EN Notes 的產品目標、技術架構、資料設計、API、部署安全與待辦。文件是給後續 agents 與開發者快速建立上下文用；變更前仍須以程式碼、設定及資料庫 migrations 確認現況。

## 依工作內容閱讀

| 工作                                       | 文件                                                       |
| ------------------------------------------ | ---------------------------------------------------------- |
| 了解專案目的、使用者範圍與已確認的產品決策 | [project-overview.md](./project-overview.md)               |
| 了解 workspace、套件職責與系統架構         | [architecture.md](./architecture.md)                       |
| 修改資料表、欄位、關聯或 migration         | [data-model.md](./data-model.md)                           |
| 新增／修改 REST API、認證路由或 OpenAPI    | [api.md](./api.md)                                         |
| 調整認證、安全、Cloudflare 設定或部署      | [security-and-deployment.md](./security-and-deployment.md) |
| 執行開發、lint、typecheck、build、本機 D1  | [development.md](./development.md)                         |
| 確認已完成項目與下一步                     | [roadmap.md](./roadmap.md)                                 |
| 查詢外部 API、詞表與平台文件               | [references.md](./references.md)                           |
| 理解 Merriam-Webster JSON 結構與內嵌標記   | [webster-json-format.md](./webster-json-format.md)         |

## 文件與程式碼的對應

- API routes/controllers/adapters/models：[`apps/api/src/routes/v1/`](../apps/api/src/routes/v1/)、[`apps/api/src/controllers/`](../apps/api/src/controllers/)、[`apps/api/src/adapters/`](../apps/api/src/adapters/)、[`apps/api/src/models/`](../apps/api/src/models/)。
- Domain-based Drizzle schema：[`apps/api/src/db/schema/`](../apps/api/src/db/schema/)。
- OpenAPI 文件：[`apps/api/src/openapi/document.ts`](../apps/api/src/openapi/document.ts)。
- Better Auth 設定與 Worker bindings 型別：[`apps/api/src/auth.ts`](../apps/api/src/auth.ts)、[`apps/api/src/env.ts`](../apps/api/src/env.ts)。
- D1 schema 按 domain 分組，Drizzle Kit 產生 SQL migrations：[`apps/api/src/db/schema/`](../apps/api/src/db/schema/)、[`apps/api/migrations/`](../apps/api/migrations/)；正式套用後不要改寫已套用的 migration。
- Worker/D1 設定與本機開發腳本：[`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc)、[`apps/api/scripts/wrangler.mjs`](../apps/api/scripts/wrangler.mjs)。
- Web 目前仍是 Vite 範例頁：[`apps/web/src/App.tsx`](../apps/web/src/App.tsx)。
- 共用 package 目前尚無實際 exports：[`packages/shared/src/index.ts`](../packages/shared/src/index.ts)。

若文件和現況不一致，先確認程式碼與 migrations，再修正文件；不要把 roadmap 中的項目描述成已完成。
