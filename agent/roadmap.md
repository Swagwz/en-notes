# 實作狀態與下一步

這份文件是目前規劃快照，不是保證時程。先檢查程式碼與 migrations，避免重複實作已完成工作。

## 已實作

- pnpm monorepo，React/Vite web starter、Hono/Cloudflare Worker API 與 shared package。
- D1 初始 schema、Better Auth tables、個人 sources/sections/vocabulary、wordlists/progress、dictionary raw response 與永久 normalized lookup。
- `/api/v1` 初版 REST routes、登入／登出、一次性 admin bootstrap、admin 建立使用者、session 要求與使用者資料隔離。
- `/api/v1/openapi.json` 與 Swagger UI。
- 本機 Wrangler/D1 scripts、Unicode Windows local-state workaround。
- 依 resource 拆分的 Hono routes/controllers/models，以及 domain-based Drizzle schema/query builder for D1。

## 優先待辦

1. **產品 UI**：將 Vite starter 改為登入與個人單字管理介面，連接 API；依同源部署或需求設定嚴格 CORS／trusted origins。
2. **詞表匯入**：核對 CEEC PDF 來源與欄位，設計可重複執行的 seed/import 流程。文件標示 6,000 詞；資料尚未加入 D1。
3. **Production setup**：確認已填入 Wrangler 的 D1 ID 指向正確資料庫、設定 secrets/vars、套用 remote migrations；再執行 bootstrap 並撤掉 bootstrap secret。
4. **Edge 防護與可觀測性**：以實際域名與流量設定 Cloudflare WAF／rate-limit 規則，至少評估 bootstrap、登入與 dictionary lookup；設定錯誤監控。
5. **自動化測試**：測試 bootstrap 只成功一次、管理員邀請、未登入拒絕、跨使用者資料不可見、source/section 關聯和 migration 新建資料庫路徑。
6. **Dictionary provider**：已建立 Learner's adapter，將常用 definitions/examples 清洗為 `CleanWordEntry[]`；D1 永久保存 raw 與 normalized JSON，命中時直接回傳。仍需以真實 provider response 驗證 miss/hit、拼字建議、超時與配額處理。
7. **API 契約可靠性**：維持分層 routes/controllers、OpenAPI 文件與 [api.md](./api.md) 一致；評估是否改為由 route schema 產生 spec。

## 尚未承諾的需求

暫無公開註冊、多租戶／公開發佈、全文搜尋、音訊檔託管或 CEEC 全量匯入的完成時程。新增此類功能前先確認使用者需求與資料來源權利。
