export type BatchStatus = 'NEW' | 'IN_PROCESSING' | 'READY_FOR_SHIPMENT' | 'SHIPPED'
export type OriginType = 'OWN_MINING' | 'PURCHASED'
export type PileStatus = 'ACTIVE' | 'SPLIT' | 'MERGED' | 'TRANSFERRED' | 'EMPTY'
export type MovementOperation = 'PILE_CREATED' | 'PILE_MERGED' | 'PILE_SPLIT' | 'PILE_TRANSFERRED'
export type AnalysisStage = 'INITIAL' | 'AFTER_ENRICHMENT' | 'BEFORE_SHIPMENT'
export type AnalysisStatus = 'DRAFT' | 'UPLOADED'
export type WarehouseStatus = 'ACTIVE' | 'CLOSED'
export type Indicator =
  | 'ASH'
  | 'MOISTURE'
  | 'CALORIFIC'
  | 'FRACTION'
  | 'SULFUR'
  | 'VOLATILE_MATTER'
  | 'GRANULOMETRIC'
  | 'OTHER'

export interface PageQuery {
  page?: number
  size?: number
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface OptionDto {
  id: string
  label: string
}

export interface BatchDto {
  id: string
  batchNumber: string
  productType: string | null
  status: BatchStatus
  coalGrade: string | null
  fraction: string | null
  originType: OriginType
  deposit: string | null
  miningSite: string | null
  quarry: string | null
  shiftPeriod: string | null
  supplier: string | null
  minedAt: string | null
  initialWeight: number
  reservedVolume: number
  inProcessingVolume: number
  shippedVolume: number
  losses: number
  currentRemainder: number
  freeVolume: number
  storageLocations: string[]
  sourceBatchIds: string[]
  sourceBatchNumbers: string[]
  pileIds: string[]
  pileNumbers: string[]
  createdAt: string
}

export interface BatchCreateRequest {
  batchNumber: string
  productType?: string
  coalGrade?: string
  fraction?: string
  originType?: OriginType
  deposit?: string
  miningSite?: string
  quarry?: string
  shiftPeriod?: string
  supplier?: string
  minedAt?: string
  initialWeight: number
}

export interface BatchUpdateRequest {
  batchNumber: string
  productType?: string
  status: BatchStatus
  coalGrade?: string
  fraction?: string
  originType: OriginType
  deposit?: string
  miningSite?: string
  quarry?: string
  shiftPeriod?: string
  supplier?: string
  minedAt?: string
  initialWeight: number
}

export interface QualityHistoryRow {
  analysisDate: string | null
  ash: number | null
  moisture: number | null
  calorific: number | null
  stage: AnalysisStage
}

export interface PileDto {
  id: string
  pileNumber: string
  volume: number
  warehouseId: string | null
  warehouseNumber: string | null
  status: PileStatus
  originSource: string | null
  batchIds: string[]
  batchNumbers: string[]
  createdAt: string
}

export interface PileCreateRequest {
  pileNumber: string
  volume: number
  warehouseId?: string | null
  originSource?: string
  batchIds?: string[]
}

export interface PileSplitRequest {
  volume: number
  toWarehouseId?: string | null
  newBatchNumber: string
  sendImmediately: boolean
}

export interface PileMergeRequest {
  sourcePileIds: string[]
  targetPileId: string
}

export interface PileTransferRequest {
  toWarehouseId: string
}

export interface MovementDto {
  id: string
  batchId: string | null
  batchNumber: string | null
  pileId: string | null
  pileNumber: string | null
  operation: MovementOperation
  volume: number
  fromLocation: string | null
  toLocation: string | null
  originSource: string | null
  createdAt: string
  qrUrl: string
}

export interface MovementCreateRequest {
  batchId?: string | null
  pileId?: string | null
  operation: MovementOperation
  volume: number
  fromLocation?: string
  toLocation?: string
  originSource?: string
}

export interface LabDto {
  id: string
  name: string
}

export interface AnalysisValueDto {
  indicator: Indicator
  value: number
  unit: string | null
}

export interface AnalysisDto {
  id: string
  sampleNumber: string
  batchId: string
  batchNumber: string
  labId: string
  labName: string
  protocolNumber: string | null
  responsibleEmployee: string | null
  method: string | null
  analysisDate: string | null
  stage: AnalysisStage
  status: AnalysisStatus
  values: AnalysisValueDto[]
  createdAt: string
}

export interface AnalysisCreateRequest {
  sampleNumber: string
  batchId: string
  labId: string
  protocolNumber?: string
  responsibleEmployee?: string
  method?: string
  analysisDate?: string
  stage?: AnalysisStage
  values: { indicator: Indicator; value: number; unit?: string }[]
}

export interface WarehouseDto {
  id: string
  number: string
  location: string | null
  status: WarehouseStatus
  pileCount: number
  createdAt: string
}

export interface WarehouseCreateRequest {
  number: string
  location?: string
  status?: WarehouseStatus
}

export interface DashboardDto {
  minedToday: number
  transferredToProcessing: number
  avgAsh: number | null
  avgMoisture: number | null
  avgCalorific: number | null
  totalRemainder: number
  freeVolume: number
  reservedVolume: number
  readyForShipment: number
  losses: number
  batchesWithDeviations: number
  concentrateYield: number | null
  costPerTon: number | null
  profitPerTon: number | null
  batchCount: number
  pileCount: number
  warehouseCount: number
  labCount: number
}
