# 認證、安全與部署

## 已實作控制

- Better Auth email/password 已啟用；一般 sign-up 關閉，密碼長度限制 12–128。
- 初始管理者透過 `/api/v1/bootstrap` 建立：需要 `BOOTSTRAP_SECRET`、固定 `BOOTSTRAP_ADMIN_EMAIL`，且資料庫必須沒有任何 user。建立流程使用 password hash 與 D1 batch；完成後 endpoint 回 409。
- 管理者用 `POST /api/v1/users` 建立其他帳號。這不是公開註冊。
- 需登入的 Hono API 先讀 Better Auth session，並以 `user_id` 限制 source、section 與 vocabulary 查詢。
- Better Auth rate limiter 已啟用，設定為 100 requests/10 秒；IP 取自 Cloudflare 設定的 `cf-connecting-ip` header。
- Dictionary key 僅由 Worker environment 讀取；D1 已有該詞紀錄時不需 key，只有 cache miss 且 key 缺少時 lookup 回 503。
- Swagger UI 與 OpenAPI JSON 預設隱藏；僅本機 dev script 設定 `API_DOCS_ENABLED=true` 時提供。這只減少 API schema 的公開面，資料 API 仍各自要求 session。

## 部署前必要設定

1. 確認 [`apps/api/wrangler.jsonc`](../apps/api/wrangler.jsonc) 中已設定的 D1 binding、名稱與 database ID 指向預期的 Cloudflare 資料庫。
2. 以 Worker secrets 設定 `BETTER_AUTH_SECRET`、`BOOTSTRAP_SECRET`，以及有使用字典時的 `WEBSTER_LEARNERS_API_KEY`。
3. 設定 Worker vars `BETTER_AUTH_URL` 與 `BOOTSTRAP_ADMIN_EMAIL`。
4. 套用 remote migrations、執行一次 bootstrap 建立管理者，完成後移除 `BOOTSTRAP_SECRET`。
5. 確認正式域名、session cookie、可信來源與前端跨來源需求。

Wrangler 已設定 D1 binding 和 database ID；repo 本身無法確認該 ID 在 Cloudflare 帳號中的狀態、remote migrations 或 Dashboard 上的 Worker secrets/vars。WAF／Cloudflare edge rate-limit 規則也未從 repo 驗證。不要假設程式內 Better Auth rate limit 已取代 edge 層防護；可依實際流量為登入、bootstrap 與其他昂貴路由另設規則。

## 尚待補上的防護與驗證

- 尚未設定 CORS 或前端 origin allowlist。若 web 和 API 使用不同 origin，需一併配置 Hono CORS 與 Better Auth trusted origins，不能使用任意 origin + credentials。
- 沒有 email verification、密碼重設寄信或邀請郵件流程；目前 admin 建立使用者是管理者直接設定密碼。
- 尚未以真實 Webster API key 驗證 provider response、配額與失敗處理。
- 尚無針對認證、user ownership、bootstrap 競態與 rate limit 的自動化整合測試。

個人／家庭使用降低的是預期流量，不會降低公開 Worker 被掃描的可能性。公開部署前仍需確認 bootstrap secret 已移除、註冊確實關閉、資料查詢有 user scope，並設定 edge 層防護及監控。
