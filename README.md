# QuickSeat

純前端的教室排座位工具。建立教室配置、匯入學生名單、設定排座規則，安排座位後輸出座位表，所有資料只留在使用者的瀏覽器。

目前可編輯教室格線：以筆刷或矩形設定座位與禁坐區，走道則以整列或整欄建立，調整教室尺寸、座位編號與格子大小，並支援本機自動儲存。名單頁可匯入 CSV、TSV 或 XLSX，確認欄位映射後合併或覆蓋名單，也能手動新增、編輯、刪除人員，建立標籤並批次套用。排座頁支援連續座位與梅花座，可依座號／姓名／匯入順序或隨機自動分配，也能切換手動排座直接選取或拖曳人員入座；手動安排可先選人員再選座位，或先選座位再選人員。再點一次選取項目、按 Esc 或點擊座位圖空白處可取消選取。兩者都可拖曳交換座位、鎖定人員、補排未分配人員與處理容量不足。匯出頁可下載 Excel 座位表、自包含的唯讀 HTML、PDF 列印輸出，或匯出與匯入完整專案 JSON；匯出前可用變數自由組合座位內容，調整欄位順序、換行、標籤與文字對齊，並可調整紙張尺寸、方向、邊界、每頁列數、頁碼與跨頁表頭；邊界可設為 0，預覽會以虛線標示紙張邊界。每頁列數會依紙張與格高自動設定上限，降低格高可增加列數；預覽與列印皆維持實際紙張比例。整列或整欄沒有座位時，可分別設定無座位欄寬與列高比例，套用至 Excel、HTML 與 PDF；只要該列或該欄有一個座位，就會維持一般尺寸。可控制標題、頁首右側統計、講台、未分配名單、走道文字等內容；日期可選擇顯示於頁尾，並可調整格線間距、框線粗細與頁框顯示。右側設定以「內容、版面、顯示、Excel」分頁整理，方便分開調整座位內容、頁面版面、顯示區塊與 Excel 名單欄位。HTML 與 PDF 共用紙張尺寸、格高、字級與自動換行設定。Excel 使用固定座位版面，名單對照可選擇要輸出的欄位。PDF 可先開啟完整分頁預覽，再從瀏覽器另存 PDF。匯入前可選擇先下載目前專案的備份。復原與重做為所有分頁共用的全域操作，可從頁首按鈕或 Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z、Ctrl+Y 使用。手機為唯讀檢視，平板與電腦可完整編輯。

## 開發

需求：Node.js 22.12 以上。

```bash
npm install
npm run dev
```

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 型別檢查並建置靜態檔案 |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | 執行 Oxlint 靜態檢查 |
| `npm test` | 以監看模式執行測試 |
| `npm run test:run` | 執行一次測試 |
| `npm run coverage` | 執行測試並產生覆蓋率報告 |

## 部署

推送至 `main` 分支後，GitHub Actions 會依序執行靜態檢查、測試與建置，再部署到 GitHub Pages。

- Pages 來源需設為「GitHub Actions」。
- 建置時的 `base` 在 GitHub Actions 環境下為 `/quick-seat/`，本機為 `/`。
- 部署流程位於 `.github/workflows/deploy.yml`。

## 專案結構

```text
src/
  app/          應用程式外殼、分頁定義與全域 Provider
  components/   共用介面元件
  features/     教室編輯器、名單管理、排座核心、匯出與專案狀態
  pages/        五個排座流程頁面
  styles/       Tailwind 進入點與設計權杖
  test/         測試環境設定
  types/        領域型別
```

## 技術

Vite、React、TypeScript、Tailwind CSS、Radix UI、Zustand、dnd-kit、Papa Parse、read-excel-file、write-excel-file、Zod、Vitest 與 React Testing Library。
