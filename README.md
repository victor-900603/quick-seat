# QuickSeat

純前端的教室排座位工具。建立教室配置、匯入學生名單、設定排座規則，安排座位後輸出座位表，所有資料只留在使用者的瀏覽器。

目前可編輯教室格線：以筆刷或矩形設定座位、走道與禁坐區，調整教室尺寸、座位編號與格子大小，並支援本機自動儲存。名單頁可匯入 CSV、TSV 或 XLSX，確認欄位映射後合併或覆蓋名單，也能手動新增、編輯、刪除人員，建立標籤並批次套用。復原與重做為所有分頁共用的全域操作，可從頁首按鈕或 Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z、Ctrl+Y 使用。手機為唯讀檢視，平板與電腦可完整編輯。

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
  features/     教室編輯器、名單管理與專案狀態
  pages/        五個排座流程頁面
  styles/       Tailwind 進入點與設計權杖
  test/         測試環境設定
  types/        領域型別
```

## 技術

Vite、React、TypeScript、Tailwind CSS、Radix UI、Zustand、Papa Parse、read-excel-file、Vitest 與 React Testing Library。
