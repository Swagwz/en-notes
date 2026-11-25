# 實作狀態與下一步

這份文件是目前規劃快照，不是保證時程。先檢查程式碼與 migrations，避免重複實作已完成工作。

## 已實作

- pnpm monorepo，React/Vite web starter、Hono/Cloudflare Worker API 與 shared package。
- D1 初始 schema、Better Auth tables、個人 sources/sections/vocabulary、wordlists/progress、dictionary cache/normalized entries。
- `/api/v1` 初版 REST routes、登入／登出、一次性 admin bootstrap、admin 建立使用者、session 要求與使用者資料隔離。
- `/api/v1/openapi.json` 與 Swagger UI。
- 本機 Wrangler/D1 scripts、Unicode Windows local-state workaround。

## 優先待辦

1. **產品 UI**：將 Vite starter 改為登入與個人單字管理介面，連接 API；依同源部署或需求設定嚴格 CORS／trusted origins。
2. **詞表匯入**：核對 CEEC PDF 來源與欄位，設計可重複執行的 seed/import 流程。文件標示 6,000 詞；資料尚未加入 D1。
3. **Production setup**：建立 D1、替換 placeholder ID、設定 secrets/vars、套用 remote migrations；再執行 bootstrap 並撤掉 bootstrap secret。
4. **Edge 防護與可觀測性**：以實際域名與流量設定 Cloudflare WAF／rate-limit 規則，至少評估 bootstrap、登入與 dictionary lookup；設定錯誤監控。
5. **自動化測試**：測試 bootstrap 只成功一次、管理員邀請、未登入拒絕、跨使用者資料不可見、source/section 關聯和 migration 新建資料庫路徑。
6. **Dictionary provider**：有 API key 後驗證 Webster response shape、cache hit、拼字建議、上游錯誤、超時與配額行為。
7. **API 契約可靠性**：維持 handlers、OpenAPI 手寫物件與 [api.md](./api.md) 一致；評估是否改為由 route schema 產生 spec。

## 尚未承諾的需求

暫無公開註冊、多租戶／公開發佈、全文搜尋、音訊檔託管或 CEEC 全量匯入的完成時程。新增此類功能前先確認使用者需求與資料來源權利。
