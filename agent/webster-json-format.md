# Merriam-Webster JSON 格式整理

本文整理 [Merriam-Webster JSON Documentation](https://dictionaryapi.com/products/json) 中與本專案 Learner's Dictionary API 最相關的資料結構與顯示標記。官方以 Collegiate 格式說明共通 entry 結構（第 2 節），第 3 節補充多個字典產品共用的欄位，第 4 節則是 Advanced Learner's Dictionary 專屬欄位。文件其他產品（如 thesaurus、Elementary、Medical、Spanish-English）的專屬格式不一定適用於本專案。

## 重要概念

- 回應不是單一 `{ word, definition }` 物件。Learner's endpoint 會回傳多筆結果；結果可能是字典 entry，也可能是拼字建議字串。
- 同一個查詢可能有多個 entry，例如不同詞性或同形異義字。以 `meta.id` 識別 entry；同形異義項常以 `:1`、`:2` 等區分。
- 欄位依 entry 而異，應視為可選欄位；不要假設每筆都有發音、詞性、定義或短定義。
- `def` 是有層級的內容結構，`dt` 也可能混合文字和其他型別的區塊。它們不是已排版好的 HTML。
- Merriam-Webster 將排版標記與語意標記寫在字串內，例如 `{it}...{/it}`、`{wi}...{/wi}`。消費端需要自行解讀和呈現。

## Entry 的主要欄位

| 欄位                 | 用途                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta`               | Entry metadata。常用成員包含 `id`、`uuid`、`sort`、`src`、`section`、`stems`、`offensive`；部分資料集另有 `target` 指向另一套 MW 資料。多數 metadata 用於識別與查詢，不直接顯示。 |
| `meta.highlight`     | Learner's Dictionary 專屬提示，表示該 entry 在產品中有特別標示；依官方產品格式處理，不要當成通用的 CSS style。                                                                    |
| `meta.app-shortdef`  | Learner's Dictionary 的簡短預覽資料，內含 `hw`、`fl` 和 `def`。官方建議用於 entry preview，不要和完整 `def` 同時顯示。                                                            |
| `hom`                | 同形異義 entry 的序號；可能沒有此欄位。一般顯示在 headword 前方的上標位置。                                                                                                       |
| `hwi`                | Headword information。`hw` 是 headword；`prs` 可列出多個發音。`hw` 中的 `*` 是音節分隔提示，顯示拼字時應按產品規則處理，不應原樣當成單字字母。                                    |
| `ahws`               | Alternate headwords，例如不常見或地區性拼法；欄位可能不存在。                                                                                                                     |
| `fl`、`gram`、labels | 詞性或語法／使用標籤。標籤也可能出現在個別 sense，而不只是 entry 根層。                                                                                                           |
| `ins`、`vrs`         | Inflections 與 spelling/style variants；可以包含多筆形式、標籤和各自的發音。                                                                                                      |
| `def`                | 一個或多個 definition sections，可能包含 `vd`（動詞 transitive/intransitive 分組）及 `sseq`。                                                                                     |
| `shortdef`           | 精簡版定義陣列，供簡短預覽使用；不是完整定義的替代品。                                                                                                                            |
| `uros`、`dros`       | Undefined / defined run-ons，例如派生形式、片語或 phrasal verbs。                                                                                                                 |
| 其他可選區塊         | 依 entry 可能出現 `et`、`date`、`syns`、`usages`、`quotes`、`srefs`、`urefs`、`artl` 等。                                                                                         |

### 發音與音訊

`prs` 是發音陣列。每項可含 `mw`（Merriam-Webster pronunciation notation）或 `ipa`、發音前後標籤 `l`／`l2`、分隔標點 `pun`，以及 `sound.audio`。Learner's Dictionary 還可能提供 `altprs`；欄位出現位置依 entry 結構而異。

`sound.audio` 是音檔 base filename，不是完整 URL。官方文件列出音檔 URL 格式：

```text
https://media.merriam-webster.com/audio/prons/{language}/{country}/{format}/{folder}/{audio}.{format}
```

英文資料使用 `en/us`；格式可用 `mp3`、`wav` 或 `ogg`。資料夾規則為：`audio` 以 `bix` 開頭用 `bix`、以 `gg` 開頭用 `gg`、以數字或底線開頭用 `number`，其他情況用首字母。

## Definitions 的巢狀結構

大致結構如下；省略的項目代表官方格式中還有其他分支：

```text
entry
└─ def[]
   ├─ vd?                 動詞分類
   └─ sseq[]
      └─ [tag, payload]   例如 ["sense", {...}]、["sen", {...}]
         └─ dt[]           定義內容區塊
            ├─ ["text", "..."]
            ├─ ["vis", [{ "t": "...", "aq": {...}? }]]
            └─ 其他型別區塊
```

- `sseq` 是巢狀陣列，不是單純的 sense 物件清單。項目以 tag/payload 配對表達，例如 `sense`、`sen`、`pseq`、`bs`。
- 一般 `sense` 可有 `sn`（sense number）、sense-specific labels、`ins`、`vrs`、`sgram` 等欄位。
- `dt` 是有順序的區塊陣列。常見的 `["text", "..."]` 可能混合純文字和內嵌 tokens；`["vis", [...]]` 是 usage illustrations，元素常有 `t`，有時也有引用來源 `aq`。
- Sense 內容還可能包含 `sdsense`（細分的相關意思）、`snote`、`uns`、`ri`、交叉參照等。正確呈現需要遞迴處理，不宜只讀第一個 `text`。
- `dros` 本身又可帶有 `def`，所以片語的定義也要走相同的巢狀解析。

## Learner's Dictionary 專屬或常見補充欄位

官方 JSON 文件的第 4 節列出 Advanced Learner's English Dictionary 的特有欄位，主要包括：

- `meta.highlight`、`meta.app-shortdef`
- `altprs`
- `gram`、`wsgram`
- `bnote`、`snotebox`
- `phrasev`、`sphrasev`、`phsls`
- `rsl`
- `artl`

其中 `phrasev`／`sphrasev` 用於 phrasal verb 的形式展示；`wsgram` 是特定 sense 內容中的語法標籤。這些不是一般 CSS style，而是具有產品語意或顯示提示的欄位。

## 字串中的內嵌 tokens

Tokens 是 Merriam-Webster 的文字標記語法，不是 HTML。常見 token 配對如下：

| Token                              | 用途／呈現提示                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| `{b}...{/b}`                       | 粗體                                                         |
| `{it}...{/it}`                     | 斜體                                                         |
| `{sc}...{/sc}`                     | 小型大寫字                                                   |
| `{inf}...{/inf}`、`{sup}...{/sup}` | 下標、上標                                                   |
| `{bit}...{/bit}`                   | 粗斜體                                                       |
| `{itsc}...{/itsc}`                 | 斜體小型大寫字                                               |
| `{rom}...{/rom}`                   | 一般字體                                                     |
| `{bc}`                             | 粗體冒號及其後空格                                           |
| `{p_br}`                           | 段落換行                                                     |
| `{ldquo}`、`{rdquo}`               | 左、右雙引號                                                 |
| `{wi}...{/wi}`                     | 使用例句中標示被解釋／示範的字                               |
| `{phrase}...{/phrase}`             | 標示片語                                                     |
| `{qword}...{/qword}`               | 引文中標示目標字                                             |
| `{parahw}...{/parahw}`             | 段落標題中的 headword                                        |
| `{gloss}...{/gloss}`               | 對上下文用法的編輯性註解                                     |
| `{ds}`                             | `date` 欄位中的 sense 連結資訊，不是一般定義文字的格式標記。 |

交叉參照也嵌在字串中，常見形式包括 `{a_link|...}`、`{d_link|...}`、`{i_link|...}`、`{sx|...}`、`{dxt|...}`、`{mat|...}`，以及包住參照群組的 `{dx}...{/dx}`、`{dx_def}...{/dx_def}`、`{dx_ety}...{/dx_ety}`、`{ma}...{/ma}`。`|` 分隔 token 參數；各 token 的參數數量和 target 規則不同，不能一律當成普通文字或直接當 URL。

## 對前端呈現的建議

1. 先用 JSON parser 解析 response，再解析特定字串欄位中的 MW tokens；不要把 API 字串直接交給 `innerHTML`。
2. 將 token 轉成受控的 UI 元素，例如 `{it}` 對應 `<em>`、`{b}` 對應 `<strong>`、`{sup}` 對應 `<sup>`。未知 token 應安全地保留為文字或記錄診斷，不可當作任意 HTML 執行。
3. 依序渲染 `dt` 的各區塊，並遞迴處理 `sseq`、`sdsense`、`dros` 等結構；同時保留 sense number、labels 和 usage examples。
4. `shortdef` 適合搜尋結果／卡片預覽；完整 entry 應以 `def` 為主。
5. 把 `sound.audio` 當檔名資料，依官方規則組音檔 URL；不要假設 API 直接回傳可播放 URL。
6. 保存原始 response 有助於未來支援尚未解析的欄位，但 raw preservation 不等於已完成完整 renderer。

## 本專案目前的解析範圍

API 回應的 `data` 是清洗後的 `CleanWordEntry[]`，每筆包含 `word`、`partOfSpeech`、`phonetic`、`audioUrl` 和 `meanings`（definition/examples）。Adapter 會清除 headword 音節分隔星號、轉換 MW inline tokens、解析多個 definition sections 中的 `sense`／`sen`／`bs`／`pseq`，並擷取 `dt` 文字和 `vis` 例句；沒有可解析完整定義時，使用 `shortdef` 作為預覽備援。發音優先取第一筆 `mw`，其次取 `ipa`；音檔 URL 依官方路徑規則組成。

原始完整 response 保存於 `dictionary_lookups.response_json`，adapter 產生的 `CleanWordEntry[]` 則存於 `dictionary_lookups.normalized_json`；`dictionary_entries.entry_json` 保留每筆 provider entry，並提供淺層索引。查到 D1 紀錄時直接回傳 normalized JSON，不呼叫 Webster，也不重跑 adapter；只有查無紀錄時才呼叫 Webster。既有資料若尚未有 normalized JSON，會以原始 response 轉換後補存。這些 lookup 不會自動過期。此 adapter 不是完整的 Webster renderer：例如 run-ons、labels、etymology、artwork 和所有特殊 token 語意都不會出現在 CleanWordEntry。根層型別錯誤、entry 無法取得 headword，或 `shortdef` 型別不符時會回報 provider error，不會保存該 response。程式碼位置：[`webster-learners.adapter.ts`](../apps/api/src/adapters/webster-learners.adapter.ts)、[`dictionary.model.ts`](../apps/api/src/models/dictionary.model.ts)、[`dictionary.controller.ts`](../apps/api/src/controllers/dictionary.controller.ts)、[`dictionary.ts`](../apps/api/src/db/schema/dictionary.ts)。

## 來源

- [Merriam-Webster JSON Documentation](https://dictionaryapi.com/products/json) — 共通 entry 格式、token 語法，以及 Learner's Dictionary 專屬欄位。
- [Merriam-Webster Learner's Dictionary API](https://dictionaryapi.com/products/api-learners-dictionary) — 本專案使用的 API 產品與查詢方式。
