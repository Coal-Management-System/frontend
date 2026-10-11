import type {
  AnalysisStage,
  BatchStatus,
  HeapStatus,
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

export const heapStatusLabels: Record<HeapStatus, string> = {
  ACTIVE: 'Активна',
  SPLIT: 'Разделена',
  MERGED: 'Объединена',
  TRANSFERRED: 'Перемещена',
  EMPTY: 'Пуста'
}

export const operationLabels: Record<MovementOperation, string> = {
  PILE_CREATED: 'Создание кучи',
  PILE_MERGED: 'Слияние куч',
  PILE_SPLIT: 'Разделение кучи',
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
  heapNumber: 'номер кучи',
  volume: 'объем',
  newBatchNumber: 'номер новой партии',
  number: 'номер склада',
  name: 'название',
  sampleNumber: 'номер пробы',
  batchId: 'партия',
  labId: 'лаборатория',
  sourceHeapIds: 'объединяемые кучи',
  targetHeapId: 'куча-приемник',
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

export function errMsg(e: unknown): string {
  const anyE = e as { response?: { data?: { message?: string } }; message?: string }
  const raw = anyE?.response?.data?.message || anyE?.message || 'Ошибка запроса'
  return raw.replace(/[A-Za-z][A-Za-z0-9_]*/g, (token) => fieldLabels[token] ?? token)
}
