export const TABS = [
  {
    id: 'classroom',
    step: '01',
    label: '教室',
    kicker: 'CLASSROOM',
    title: '教室配置',
    description:
      '畫出教室的座位、走道與禁坐區，設定座位編號規則，建立後續排座的空間基礎。',
    planned: [
      '格線畫布、筆刷與矩形批次編輯',
      '整列與整欄走道、禁坐區與座位編號規則',
      '教室尺寸調整與自訂座位編號',
    ],
    previewLabel: '教室畫布',
  },
  {
    id: 'roster',
    step: '02',
    label: '名單',
    kicker: 'ROSTER',
    title: '學生名單',
    description:
      '匯入 Excel 或 CSV 名單，確認欄位映射，並用標籤描述分組、需求與其他排座條件。',
    planned: [
      'CSV、TSV 與 XLSX 匯入及欄位映射',
      '標籤定義、批次套用與色票管理',
      '空白姓名、重複座號與資料衝突檢查',
    ],
    previewLabel: '名單預覽',
  },
  {
    id: 'rules',
    step: '03',
    label: '規則',
    kicker: 'RULES',
    title: '排座規則',
    description:
      '用規則卡描述分開、同組、位置與避開條件，分別設定硬約束與軟約束的優先程度。',
    planned: [
      '分開、同組、位置、避開與固定座位',
      '硬約束、軟約束與權重設定',
      '即時衝突判定、停用切換與座位定位',
      '自動排座依規則最佳化，也可關閉最佳化',
    ],
    previewLabel: '規則卡',
  },
  {
    id: 'seating',
    step: '04',
    label: '排座',
    kicker: 'SEATING',
    title: '安排座位',
    description:
      '選擇連續或梅花座配置，自動分配或直接手動安排，再拖曳微調並檢視鄰居關係。',
    planned: [
      '連續座位與梅花座相位設定',
      '依座號、姓名、匯入順序或隨機分配，也可直接手動安排',
      '拖曳調整、鎖定重排與未分配補位',
    ],
    previewLabel: '座位圖',
  },
  {
    id: 'export',
    step: '05',
    label: '匯出',
    kicker: 'EXPORT',
    title: '匯出與備份',
    description:
      '用變數自由組合座位內容，設定紙張、分頁與顯示欄位，即時確認列印結果並備份完整專案。',
    planned: [
      '以模板變數組合座位內容與文字對齊',
      '紙張尺寸、方向、邊界、每頁列數與頁碼',
      '可切換標題、統計、講台、未分配名單、走道文字與頁尾',
      'Excel 名單欄位選擇與固定座位版面',
      '紙張尺寸、方向、格高、字級、間距、框線與無座位軌道尺寸',
      'PDF 完整分頁預覽與另存 PDF',
      '專案 JSON 匯出、備份與匯入',
    ],
    previewLabel: '輸出格式',
  },
] as const

export type TabId = (typeof TABS)[number]['id']

export function getTab(id: TabId) {
  const tab = TABS.find((item) => item.id === id)

  if (!tab) {
    throw new Error(`未知的分頁：${id}`)
  }

  return tab
}
