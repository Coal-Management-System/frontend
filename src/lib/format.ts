import type {
  AnalysisStage,
  BatchStatus,
  PileStatus,
  Indicator,
  MovementOperation,
  OriginType,
  WarehouseStatus
} from '@/api/types'

export const batchStatusLabels: Record<BatchStatus, string> = {
  NEW: 'Новая',
  IN_PROCESSING: 'В переработке',
  READY_FOR_SHIPMENT: 'Готова к отгрузке',
  SHIPPED: 'Отгружена'
}

export const originLabels: Record<OriginType, string> = {
  OWN_MINING: 'Собственная добыча',
  PURCHASED: 'Закупной уголь'
}

export const pileStatusLabels: Record<PileStatus, string> = {
  ACTIVE: 'Активен',
  SPLIT: 'Разделен',
  MERGED: 'Объединен',
  TRANSFERRED: 'Перемещен',
  EMPTY: 'Пуст'
}

export const operationLabels: Record<MovementOperation, string> = {
  PILE_CREATED: 'Создание штабеля',
  PILE_MERGED: 'Слияние штабелей',
  PILE_SPLIT: 'Разделение штабеля',
  PILE_TRANSFERRED: 'Трансфер'
}

export const stageLabels: Record<AnalysisStage, string> = {
  INITIAL: 'Исходный анализ',
  AFTER_ENRICHMENT: 'После обогащения',
  BEFORE_SHIPMENT: 'Перед отгрузкой'
}

export const indicatorLabels: Record<Indicator, string> = {
  ASH: 'Зольность',
  MOISTURE: 'Влажность',
  CALORIFIC: 'Калорийность',
  FRACTION: 'Фракция',
  SULFUR: 'Содержание серы',
  VOLATILE_MATTER: 'Выход летучих веществ',
  GRANULOMETRIC: 'Гранулометрический состав',
  OTHER: 'Другой показатель'
}

export const warehouseStatusLabels: Record<WarehouseStatus, string> = {
  ACTIVE: 'Активен',
  CLOSED: 'Закрыт'
}

const fieldLabels: Record<string, string> = {
  batchNumber: 'номер партии',
  initialWeight: 'объем партии',
  pileNumber: 'номер штабеля',
  volume: 'объем',
  newBatchNumber: 'номер новой партии',
  number: 'номер склада',
  name: 'название',
  sampleNumber: 'номер пробы',
  batchId: 'партия',
  labId: 'лаборатория',
  sourcePileIds: 'объединяемые штабели',
  targetPileId: 'штабель-приемник',
  toWarehouseId: 'склад назначения',
  operation: 'операция',
  indicator: 'показатель',
  value: 'значение'
}

export function fmt(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('ru-RU') + suffix
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const tail = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (tail === 1) return forms[0]
  if (tail > 1 && tail < 5) return forms[1]
  return forms[2]
}

export function errMsg(e: unknown): string {
  const anyE = e as { response?: { data?: { message?: string } }; message?: string }
  const raw = anyE?.response?.data?.message || anyE?.message || 'Ошибка запроса'
  return raw.replace(/[A-Za-z][A-Za-z0-9_]*/g, (token) => fieldLabels[token] ?? token)
}
