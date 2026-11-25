# 產品目標與已確認決策

## 產品目標

EN Notes 是個人英文單字學習網站，優先服務屋內／家庭的少數使用者（目前估計少於 5 人），不是面向公眾的詞典或開放註冊 SaaS。即使使用者很少，仍需要認證、資料隔離與避免暴露管理功能。

使用者可以從書籍、新聞、文章、影片等來源收集不熟悉的單字或片語，再查字典；另有獨立的預設詞表頁面，可把詞表項目加入個人學習進度。

每日約 100,000 requests 是使用者提出的部署容量假設，尚未做負載測試或成本驗證，不應當成已驗證的 Cloudflare 容量承諾。

## 已確認的領域名稱

- `sources`：使用者的閱讀／觀看來源，涵蓋書、新聞、文章、影片等；比 `books` 廣泛。
- `sections`：source 底下可選的分段，可對應章、文章段落或影片片段。避免稱為 `sessions`，因該名稱也用於登入 session。
- `vocabulary_items`：個人收集的單字或片語；不是 dictionary 的標準字典條目。
- `wordlists`：預先提供的獨立詞表，不隸屬於個人 source；每位使用者另有自己的進度。
- `dictionary_entries`：Dictionary provider 回傳項目的正規化資料；lookup 的完整回應另行快取。

source、section 都可缺省於單字項目；兩者都為 null 表示放在個人 root。若有 section，API 會從 section 對應到 source。

## 已確認的技術／產品決策

- API 使用 Hono，部署目標為 Cloudflare Workers，資料庫使用 D1。
- API 使用版本路徑 `/api/v1`，採用 REST resource 路徑，不在一般資源 URL 放動詞。
- 使用 Better Auth 的 email/password；關閉公開註冊，由管理者開通帳號，以一次性 bootstrap 建立初始管理者。目前沒有寄送邀請郵件的流程。
- 字典 provider 選 Merriam-Webster Learner's Dictionary。API key 尚需使用者自行設定。
- CEEC 高中英文參考詞彙表是單獨的 wordlist。原 PDF 標示 6,000 詞；目前資料表尚未匯入詞表內容。

## 尚未成為已實作功能

Web UI 仍為 Vite/React starter；前端登入、單字管理與詞表卡片頁尚未完成。CEEC 詞表資料尚未 seed。production D1 資源、真實 `database_id`、Worker secrets 與自訂網域也尚未設定。
