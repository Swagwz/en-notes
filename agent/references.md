# 專案參考資料

## Repository source of truth

- API handlers 與 OpenAPI：[`apps/api/src/index.ts`](../apps/api/src/index.ts)
- Better Auth：[`apps/api/src/auth.ts`](../apps/api/src/auth.ts)
- D1 migrations：[`apps/api/migrations/`](../apps/api/migrations/)
- Worker config：[`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc)
- 本機 API 指引：[`apps/api/README.md`](../apps/api/README.md)
- Workspace scripts：[`package.json`](../package.json)、各 workspace package 的 `package.json`

## 外部原始資料與官方文件

- [CEEC 高中英文參考詞彙表（111 學年度起適用）PDF](https://www.ceec.edu.tw/files/file_pool/1/0k213571061045122620/%e9%ab%98%e4%b8%ad%e8%8b%b1%e6%96%87%e5%8f%83%e8%80%83%e8%a9%9e%e5%bd%99%e8%a1%a8%28111%e5%ad%b8%e5%b9%b4%e5%ba%a6%e8%b5%b7%e9%81%a9%e7%94%a8%29.pdf) — PDF 標示 6,000 詞；尚未匯入。
- [Merriam-Webster Learner's Dictionary API](https://dictionaryapi.com/products/api-learners-dictionary) — 取得最新 response schema 與使用條款；API key 由部署環境提供。
- [Merriam-Webster JSON Documentation](https://dictionaryapi.com/products/json) — 共通與 Learner's JSON 欄位、sense 結構和字串 tokens；專案摘要見 [webster-json-format.md](./webster-json-format.md)。
- [Better Auth rate limiting](https://www.better-auth.com/docs/concepts/rate-limit) — rate-limit、代理 IP header 與設定參考。
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/) — D1 建立、migration 與限制。
- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) — Worker 部署、bindings、secrets 與安全設定。

外部 API 與平台行為可能更新；涉及依賴行為的實作，應以官方當前文件與本 repo 實測為準。
