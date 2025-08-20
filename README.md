# ZipLink

一個使用 Node.js + Express + MongoDB 打造的短網址與 QR Code 服務。

- 前端靜態頁面位於 `public/`，以 `fetch` 呼叫後端 API。
- 後端主要程式為 `app.js`，負責建立/查詢短網址，並處理短碼轉址。
- 以 `nanoid` 產生 7 碼短碼，並用 `qrcode` 產生 QR Code（Data URL）。

## 功能

- 建立短網址，回傳短碼、短網址、以及 QR Code 圖片（Base64 Data URL）。
- 查詢短碼資訊（原始網址、短網址、點擊次數、建立時間、最後點擊時間）。
- 透過 `/:code` 進行轉址並累計點擊次數。

## 專案結構

```
.
├─ app.js                 # Express 入口；API 與轉址邏輯
├─ public/
│  ├─ index.html          # 前端頁面（中文 UI）
│  ├─ main.js             # 前端互動邏輯（呼叫 API、顯示結果）
│  └─ style.css           # 樣式
├─ .env.example           # 環境變數範例（請複製為 .env）
├─ package.json
└─ README.md
```

## 環境需求

- Node.js 18+（建議）
- 可用的 MongoDB（本機或雲端）

## 安裝與啟動

1) 安裝套件

```bash
npm install
```

2) 設定環境變數

複製 `.env.example` 為 `.env`，設定 Mongo 連線字串：

```bash
cp .env.example .env
# 編輯 .env
MONGO_URL=mongodb://localhost:27017
# 可選：PORT=3000
```

3) 啟動服務

```bash
npm run serve
```

啟動後：
- 伺服器預設在 `http://localhost:3000`
- 前端頁面在 `http://localhost:3000/`

> 想自動重啟可安裝 nodemon：`npm i -D nodemon`，再以 `npx nodemon app.js` 執行。

## API 文件

Base URL：`http://<host>:<port>`（開發環境預設 `http://localhost:3000`）

- 建立短網址
  - 方法：POST `/api/shorten`
  - Content-Type：`application/json`
  - Body：`{ "url": "https://example.com" }`
  - 回應（200）：
    ```json
    {
      "code": "Ab3xYz9",
      "originalUrl": "https://example.com",
      "shortUrl": "http://localhost:3000/Ab3xYz9",
      "clicks": 0,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "qrcode": "data:image/png;base64,iVBORw0KGgo..."
    }
    ```
  - 可能錯誤：400（Missing url / Invalid URL）、500（Server error）

- 查詢短碼資訊
  - 方法：GET `/api/info/:code`
  - 回應（200）：
    ```json
    {
      "code": "Ab3xYz9",
      "originalUrl": "https://example.com",
      "shortUrl": "http://localhost:3000/Ab3xYz9",
      "clicks": 3,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastAccessedAt": "2025-01-02T12:34:56.000Z"
    }
    ```
  - 可能錯誤：404（Not found）、500（Server error）

- 轉址
  - 方法：GET `/:code`
  - 行為：找到則 302 轉址至原始網址，並將 `clicks` +1 與更新 `lastAccessedAt`。

### cURL 範例

```bash
# 建立短網址
curl -s -X POST http://localhost:3000/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}' | jq

# 查詢短碼資訊
curl -s http://localhost:3000/api/info/Ab3xYz9 | jq
```

## 開發細節

- 短碼：`nanoid` 自訂字元表，長度 7，碰撞時以最多 5 次嘗試避開。
- URL 正規化：若缺少 `http/https` 會自動補上 `http://` 後再驗證。
- MongoDB：資料庫名 `shortenurl`，集合 `link`，Schema 見 `app.js`。
- 靜態檔案：透過 `express.static("public")` 服務 `public/` 內容。

## 部署建議

- 設定環境變數：`DB_USER`（必填）、`DB_PASS`（必填）、`DB_NAME`（必填）、`PORT`（選填）。
- 反向代理（Nginx/Cloudflare）請將根路由轉發至 Node 服務。
- 請妥善保護資料庫（認證、IP 白名單、TLS）。

## 疑難排解

- 伺服器啟動即退出：
  - 檢查 `.env` 是否有正確設定 `DB_USER`、`DB_PASS`、`DB_NAME`。
  - 確認 MongoDB 可連線，並檢視終端錯誤訊息。
- 建立短網址回傳 400 Invalid URL：
  - 請輸入有效網址（若無協定會自動補 `http://` 再驗證）。
- 前端顯示「網路錯誤」：
  - 檢查伺服器是否啟動，瀏覽器開發者工具的 Network/Console 訊息。

## 授權

此專案使用 ISC License。
