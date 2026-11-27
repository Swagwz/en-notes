# API contract

API 使用 Hono，版本 prefix 為 `/api/v1`。Resource routes 位於 [`apps/api/src/routes/v1/`](../apps/api/src/routes/v1/)，controllers 位於 [`apps/api/src/controllers/`](../apps/api/src/controllers/)，外部資料轉換 adapters 位於 [`apps/api/src/adapters/`](../apps/api/src/adapters/)，Drizzle models 位於 [`apps/api/src/models/`](../apps/api/src/models/)。OpenAPI 文件在 [`apps/api/src/openapi/document.ts`](../apps/api/src/openapi/document.ts)；本機開發的 Swagger UI 在 `/api/v1/docs`，JSON spec 在 `/api/v1/openapi.json`。Production 預設不提供這兩個文件 endpoint。

自訂資料 API 的成功回應通常包在 `{ "data": ... }`；驗證／HTTP 錯誤使用 `{ "error": { "code": "...", "message": "..." } }`。Better Auth 代理路由維持 Better Auth 自己的 response/cookie 格式。

## Route 清單

| Method                   | Path                                                  | 認證／用途                                                                  |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `GET`                    | `/health`                                             | 健康檢查                                                                    |
| `GET`                    | `/api/v1/openapi.json`                                | 本機開發限定；Production 預設隱藏                                           |
| `GET`                    | `/api/v1/docs`                                        | 本機開發限定；Production 預設隱藏                                           |
| `POST`                   | `/api/v1/bootstrap`                                   | 初始管理者建立；需 `X-Bootstrap-Secret`，且 users 表必須為空                |
| `POST`                   | `/api/v1/sessions`                                    | 使用 Better Auth email/password 登入；回傳 session cookie                   |
| `GET`                    | `/api/v1/sessions/current`                            | 讀取目前 session                                                            |
| `DELETE`                 | `/api/v1/sessions/current`                            | 登出                                                                        |
| `POST`                   | `/api/v1/users`                                       | 管理者建立使用者帳號；公開註冊關閉，沒有邀請郵件流程                        |
| `GET`, `POST`            | `/api/v1/sources`                                     | 列出／建立自己的 sources                                                    |
| `GET`, `PATCH`, `DELETE` | `/api/v1/sources/{sourceId}`                          | 讀取／更新／刪除自己的 source                                               |
| `GET`, `POST`            | `/api/v1/sources/{sourceId}/sections`                 | 列出／建立 source 的 sections                                               |
| `PATCH`, `DELETE`        | `/api/v1/sections/{sectionId}`                        | 更新／刪除自己的 section                                                    |
| `GET`, `POST`            | `/api/v1/vocabulary`                                  | 列出／新增個人單字；支援 `sourceId`、`sectionId`、`rootOnly`、`status` 篩選 |
| `GET`, `PATCH`, `DELETE` | `/api/v1/vocabulary/{itemId}`                         | 讀取／更新／刪除自己的單字                                                  |
| `GET`                    | `/api/v1/dictionary/entries?term=...`                 | 回傳 CleanWordEntry[]；D1 永久保存 raw response 和 normalized JSON，查到紀錄時直接回傳；詳見 [格式文件](./webster-json-format.md)。 |
| `GET`                    | `/api/v1/wordlists`                                   | 列出可用詞表                                                                |
| `GET`                    | `/api/v1/wordlists/{slug}/entries`                    | 分頁／依 level 讀取詞表項目及目前使用者進度                                 |
| `PUT`                    | `/api/v1/wordlists/{slug}/entries/{entryId}/progress` | 設定個人詞表進度                                                            |

除 health、bootstrap 與建立 session 外，業務路由要求登入；`GET/DELETE /sessions/current` 會各自檢查／使用 Better Auth session。所有使用者資料查詢應使用 session user id 作為 ownership 條件。Swagger/OpenAPI 只在本機開發明確設定 `API_DOCS_ENABLED=true` 時提供。

## 修改 API 時

1. 在對應的 route/controller/model/schema domain 檔案檢查 Zod input、user ownership 條件和錯誤語意。
2. 同步更新 `openApiDocument`，並以 `/api/v1/openapi.json` 確認輸出。
3. 維持資源導向路徑；不要新增 `getWords`、`createSource` 等動詞路徑。
4. 資料庫存取使用 Drizzle models，不在 controller/route 寫 SQL 字串。Schema 依 domain 維護在 `src/db/schema/`；修改後用 `pnpm --filter @en-notes/api db:generate` 產生 SQL migration，再以 Wrangler 套用。
5. 若更動 schema，更新 [data-model.md](./data-model.md)。

`wordlists` endpoints 目前只讀取詞表；詞表匯入／管理工具尚未實作。
