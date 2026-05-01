# 派工：朋友/家人專案大搬家 → rsway.net

**派工人**：郭嘉（軍師）
**執行人**：韓信（將軍）
**日期**：2026-05-01
**用途**：開新 session、複製此檔內容當第一則訊息給韓信

---

## 🎯 任務目標

**把所有「朋友/家人」專案、從 `reyway.com` 體系全部搬到新註冊的 `rsway.net`。**

主公剛買 **rsway.net**（CF Registrar、$11.86/年、已入 CF 帳號）、目的：

1. **物理切割身份排序鐵律**——核心三件事（淨淨/若水/笙之道）留在 reyway.com、朋友/家人專案搬 rsway.net
2. **資安提升**——朋友站不再共用 reyway.com 域名/Cookie/KV、降低跨站滲透風險
3. **對外打包乾淨**——以後給朋友看「rsway.net/[品牌]」、跟主公自己的 reyway.com 完全分開

**reyway.com / reyway 兩個字**：
- `reyway` = 睿之道（陳睿笙）= 主公自己
- `rsway` = 若水之道 = 若水軍團幫朋友/家人做的網站

兩個對稱、好記。

---

## 📋 搬遷清單（7 個站）

| 站 | 現址 | 新址 | 屬性 |
|---|---|---|---|
| **雅倫議員** | `yalun-reyway.pages.dev` | `yalun.rsway.net` | 朋友 |
| **大大力** | `dadali.reyway.com` | `dadali.rsway.net` | 朋友 |
| **森築** | `mori.reyway.com` | `mori.rsway.net` | 朋友 |
| **戀家小舖** | `lf.reyway.com` | `lf.rsway.net` | 朋友 |
| **BHK** | `bhks-reyway.pages.dev` | `bhk.rsway.net` | 朋友/客戶 |
| **Eagle 蹦闆精品** | （Phase 0、未上線）| `eagle.rsway.net` | 朋友 |
| **吐司專屬小老師** | `leon.reyway.com` | `leon.rsway.net` | **家人**（陳奕愷）|

### ⚠️ 不搬的兩個

| 站 | 為什麼不搬 |
|---|---|
| **皮爾卡登** `pc.reyway.com` | 主公明天 5/2 會親自跟 Kevin/Molly Li 講一聲、得到同意再搬。**這次先不動** |
| **ORAVI 歐拉薇** `oravi.reyway.com` | 主公新建子品牌、不是朋友專案、留在 reyway.com |

### ✅ 完全不動的（主公核心三）
- `reyway.com` 主站
- `cleanclean-hub.pages.dev`、所有淨淨子站
- `aiteam.reyway.com`（若水聯盟總部）
- `boardroom.reyway.com`、`brain.reyway.com`、`design.reyway.com`、`store-reyway.pages.dev` 等淨淨/若水內部站

---

## 🛠️ 每站搬遷 SOP（標準流程）

### ⚠️ Step 0：開工前先做（一次性、僅做 1 次）

**盤點本地專案路徑**——`~/Desktop/笙力軍總部/projects/` 底下沒看到 dadali-reyway / mori-reyway / yalun-reyway / lf-reyway / leon-reyway / bhks-reyway 這些資料夾、有可能：
- 在 `~/design/` 或別的位置
- 用了別的名字（例如 `dadali` 而非 `dadali-reyway`）
- 從 GitHub clone、本地沒留

韓信先跑：
```bash
# 找含品牌名的資料夾
find ~ -type d -name "*dadali*" 2>/dev/null
find ~ -type d -name "*mori*" 2>/dev/null
find ~ -type d -name "*yalun*" 2>/dev/null
find ~ -type d -name "*leon*" 2>/dev/null
find ~ -type d -name "*lf-*" 2>/dev/null
find ~ -type d -name "*bhk*" 2>/dev/null
find ~ -type d -name "*eagle*" 2>/dev/null

# 或從 GitHub 看主公的 repo 列表
gh repo list reysionchen --limit 50
```

找不到就從 GitHub clone 一份再開搬。

---

每個站照下面 6 步走、預估 15-20 分鐘/站、7 站約 2-2.5 小時：

### Step 1：盤點現況（2 分鐘）
- `git status` 看本地是否乾淨
- 看 CF Pages dashboard 確認最近 deployment commit
- 確認 KV namespace ID（每站獨立、要記下來）

### Step 2：開新 Pages 專案（3 分鐘）
```bash
cd ~/Desktop/笙力軍總部/projects/<原專案資料夾>
npx wrangler pages project create <新專案名> --production-branch main
# 例：yalun → yalun-rsway / dadali → dadali-rsway
```

### Step 3：綁定子網域（3 分鐘）
- CF Dashboard → rsway.net → DNS → 加 CNAME
  - `yalun` → `yalun-rsway.pages.dev`
- CF Pages → 新專案 → Custom domains → 加 `yalun.rsway.net`

### Step 4：搬 KV / D1（5 分鐘）
- **KV 鐵律**：每站獨立 KV、絕對不共用（[KV 每品牌獨立鐵律](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_KV每品牌獨立.md)）
- 用 `wrangler kv:key list --namespace-id=<舊>` + `wrangler kv:key get/put` 搬資料
- 或用 `~/Desktop/笙力軍總部/projects/reyway-portal/scripts/migrate-kv.sh`（皮爾卡登當時寫的腳本）

### Step 5：部署 + 驗收（5 分鐘）
- `wrangler pages deploy` 上線
- curl 測 5 條主要 endpoint 通
- 用 Chrome MCP 開站、截圖驗證視覺、登入流程、AI 工具能呼叫

### Step 6：reyway.com 主頁更新（2 分鐘）
- 把這個站的卡片從 reyway.com 主頁拿掉
- 同步在 rsway.net 主頁加上去（要先建好 rsway.net 主站、見下方）

---

## 🏗️ rsway.net 主站架構（開搬之前先做）

**第 0 步、最重要**：rsway.net 主站要先建好、不然搬過去的站沒入口。

### 主站定位（2026-05-01 主公拍板）

**品牌名**：**笙之道｜AI 心得總站**

**用途**：主公個人 AI 工作方法論、心得、案例對外發聲處（SEO 戰場 + 朋友分享）

**不是**「朋友站列表」——朋友站全縮到子網域（yalun.rsway.net / dadali.rsway.net 等）。

### 視覺風格

- **主色**：深墨藍 #1A2238 + 紅磚色 #B8442B 點綴（中性學術風、不撞淨淨綠 / 若水鏽橘）
- **字型**：思源宋體（標題）+ 思源黑體（內文）+ Inter（英數）
- **風格參考**：Anthropic blog + Naval Almanack + 林明樟知識點滴
- **Logo**：「笙之道」3 字書法體 + AI 副標
- **Hero 文案**：
  - 主標：笙之道｜AI 心得總站
  - 副標：主公一年實戰累積、AI 工作方法論的對外發聲處

### 路徑結構

```
rsway.net/
├─ index.html              ← 主站（Hero + 最新文章 + 分類入口）
├─ posts/                  ← 文章列表（部落格主力、SEO 戰場）
│  └─ 2026/05/
│     ├─ agent-vs-skill.html
│     ├─ claude-code-7招.html
│     └─ ...
├─ knowledge/              ← 公開知識庫（案例研究）
│  └─ 分析/
│     └─ 競選標語邏輯.html  ← 從 reyway.com/knowledge/分析/ 搬過來
└─ about/                  ← 關於主公（白牌化版、不洩漏 vault 機密）
```

### ⚠️ 兩個「笙之道」要分開

| 「笙之道」 | 內容 | 對外 |
|---|---|---|
| 笙之道｜AI 心得總站（主站名） | AI 工具教學、方法論 | ✅ 可、是品牌名 |
| 笙之道個人 vault（最高機密） | 9 大價值觀、刺青、家庭、投資 | ❌ 不可、終身不外傳 |

主站名共用「笙之道」、但**內容必須過濾**——只放方法論 / 工具 / 案例、絕不放個人 vault 內容。

### 雅倫競選分析頁
**優先搬**：這頁是這次任務中第一個需要曝光給雅倫團隊看的頁面。
- 從 `~/Desktop/笙力軍總部/projects/reyway-portal/knowledge/分析/競選標語邏輯.html` 搬到 `rsway.net/knowledge/分析/競選標語邏輯.html`
- 後端問卷 API 也要遷移（用 rsway.net 自己的 KV、不共用 reyway-portal 的 REYWAY_AUTH KV）

---

## 🚨 鐵律與注意事項

### 1. 不要碰 reyway.com 核心三件事
任何 cleanclean / aiteam / boardroom / brain / design 站、**完全不動**。本次只動朋友/家人 7 站。

### 2. 兩 session 部署衝突
**[兩 session 部署衝突踩坑](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_兩session部署衝突踩坑.md)**——韓信開工前、開新 session 前、確認沒別人在動同一專案。

如有衝突、用 wrangler 強制 deploy（指令在檔內）。

### 3. KV 獨立鐵律
**[KV 每品牌獨立鐵律](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_KV每品牌獨立.md)**——每站搬 KV 必須獨立、不可共用。pc-reyway 借 cleanclean KV 是歷史債、這次不要再犯。

### 4. 子網域必補主頁
**[子網域自動掛上 reyway 首頁鐵律](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_子網域自動掛上reyway首頁.md)**——這次規則改成 rsway.net 首頁、每搬一站就要在 rsway.net 主頁加卡片。

### 5. 對外打包鐵律
**[對外打包鐵律](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_對外打包鐵律.md)**——搬過去的站、grep 過濾「淨淨/若水/reyway/笙哥/員工名」等內部詞、確保乾淨。

### 6. 吐司站特殊處理
- `leon.reyway.com` 是主公兒子陳奕愷的家庭專案、**最高隱私層級**
- 搬到 `leon.rsway.net` 之後、**不放在 rsway.net 主頁公開卡片**——對外不可見、家人專屬
- 訪問靠主公直接給網址、不開公開連結
- dangerScan 雙層保護要保留（keyword + Haiku 語義 fallback）

### 7. 雅倫議員站特例
- 之前是 `yalun-reyway.pages.dev`（沒掛 reyway.com 子網域）
- 這次搬要正式接 `yalun.rsway.net`
- 雅倫團隊那邊不用通知、本來就是工具站、改網址無感

---

## 📅 建議分階段

別一次全搬、容易錯。建議：

| 階段 | 內容 | 時間 |
|---|---|---|
| **Phase 0** | rsway.net 主站建好 + 雅倫競選分析頁搬過去 | Day 1 上半 |
| **Phase 1** | 雅倫議員工具站 + 戀家小舖（朋友、低風險） | Day 1 下半 |
| **Phase 2** | 大大力 + 森築（朋友、有 KV 要搬） | Day 2 |
| **Phase 3** | BHK + Eagle（朋友、Eagle 還沒上線、簡單） | Day 2 |
| **Phase 4** | 吐司（家人、最後做、最謹慎） | Day 3 |

### 📌 Backlog（這次不執行、視主公訊號啟動）
- **皮爾卡登** `pc.reyway.com → pc.rsway.net`：主公明天 5/2 跟 Kevin/Molly Li 溝通、得到同意後另開派工單
- **ORAVI 歐拉薇**：留在 reyway.com、不搬

---

## 🪖 韓信派工建議

韓信接到這個任務後：

1. **先讀以下三份 memory**：
   - `feedback_身份排序鐵律.md`（為什麼這次要切）
   - `feedback_兩session部署衝突踩坑.md`（搬遷踩坑）
   - `feedback_KV每品牌獨立.md`（KV 不可共用）

2. **派工分配**：
   - **蕭何**：KV / D1 遷移、API 改寫（後端佔 60%）
   - **墨子**：每站前端域名替換、rsway.net 主站建立（前端佔 30%）
   - **小喬**：rsway.net 主站視覺（10%、用中性學術風、不要淨淨/若水專屬色）
   - **韓信自己**：DNS 設定、CF Pages 綁定、最終驗收

3. **每階段完工回報主公**：用 [DONE] 格式（[agent 訊息三類](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_agent_訊息三類.md)）

4. **主公手動清單**：
   - DNS CNAME 設定（韓信寫好、主公點一下「儲存」）
   - 任何需要主公點 CF Dashboard 的環節、寫成中英按鈕並列清單（[主公手動清單格式](~/.claude/projects/-Users-chenrey-design-reyway/memory/全員共用/feedback_主公手動清單格式_2026-04-30.md)）

---

## ✅ 完成定義

7 站全部搬完、主公拿到一份報告含：
- ✅ 每站新網址 + 舊網址 redirect 設定
- ✅ KV 已獨立、未共用
- ✅ rsway.net 主站上線、卡片齊全（不含吐司、不含皮爾卡登）
- ✅ 雅倫競選分析頁可分享給雅倫團隊
- ✅ reyway.com 主頁朋友站卡片已移除
- ✅ 對外 grep 自查過、無淨淨/若水/笙哥/員工名洩漏
- ✅ 主公不用碰 code、只看結果

---

**完工後韓信打 `/收工` 三連擊**：審查 + 工作日誌 + 升級。

軍師（郭嘉）已備好、等韓信開工。
