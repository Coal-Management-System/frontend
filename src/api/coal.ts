import { http } from './client'
import type {
  AnalysisCreateRequest,
  AnalysisDto,
  BatchCreateRequest,
  BatchDto,
  BatchUpdateRequest,
  DashboardDto,
  DictionaryEntryDto,
  DictionaryField,
  DictionaryMap,
  LabDto,
  MovementCreateRequest,
  MovementDto,
  OptionDto,
  Page,
  PageQuery,
  PileCreateRequest,
  PileDto,
  PileAcceptBatchRequest,
  PileLineageDto,
  PileMergeRequest,
  PileSplitRequest,
  PileTransferRequest,
  QualityHistoryRow,
  QrPassportDto,
  WarehouseCreateRequest,
  WarehouseDto
} from './types'

export const batchesApi = {
  list: (query: PageQuery = {}) =>
    http.get<Page<BatchDto>>('/batches', { params: query }).then(r => r.data),
  options: () => http.get<OptionDto[]>('/batches/options').then(r => r.data),
  get: (id: string) => http.get<BatchDto>(`/batches/${id}`).then(r => r.data),
  create: (req: BatchCreateRequest) => http.post<BatchDto>('/batches', req).then(r => r.data),
  update: (id: string, req: BatchUpdateRequest) =>
    http.put<BatchDto>(`/batches/${id}`, req).then(r => r.data),
  remove: (id: string, adminKey: string, confirmNumber: string) =>
    http
      .delete<void>(`/batches/${id}`, {
        headers: { 'X-Admin-Key': adminKey },
        params: { confirmNumber }
      })
      .then(() => undefined),
  qualityHistory: (id: string) =>
    http.get<QualityHistoryRow[]>(`/batches/${id}/quality-history`).then(r => r.data),
  analyses: (id: string) => http.get<AnalysisDto[]>(`/batches/${id}/analyses`).then(r => r.data)
}

export const pilesApi = {
  list: (query: PageQuery = {}) =>
    http.get<Page<PileDto>>('/piles', { params: query }).then(r => r.data),
  options: () => http.get<OptionDto[]>('/piles/options').then(r => r.data),
  get: (id: string) => http.get<PileDto>(`/piles/${id}`).then(r => r.data),
  create: (req: PileCreateRequest) => http.post<PileDto>('/piles', req).then(r => r.data),
  history: (id: string) => http.get<MovementDto[]>(`/piles/${id}/history`).then(r => r.data),
  lineage: (id: string) => http.get<PileLineageDto>(`/piles/${id}/lineage`).then(r => r.data),
  split: (id: string, req: PileSplitRequest) =>
    http.post<PileDto>(`/piles/${id}/split`, req).then(r => r.data),
  merge: (req: PileMergeRequest) => http.post<PileDto>('/piles/merge', req).then(r => r.data),
  acceptBatch: (id: string, req: PileAcceptBatchRequest) =>
    http.post<PileDto>(`/piles/${id}/accept-batch`, req).then(r => r.data),
  transfer: (id: string, req: PileTransferRequest) =>
    http.post<PileDto>(`/piles/${id}/transfer`, req).then(r => r.data)
}

export const movementsApi = {
  list: (query: PageQuery = {}) =>
    http.get<Page<MovementDto>>('/movements', { params: query }).then(r => r.data),
  create: (req: MovementCreateRequest) => http.post<MovementDto>('/movements', req).then(r => r.data)
}

export const labsApi = {
  labs: (query: PageQuery = {}) =>
    http.get<Page<LabDto>>('/labs', { params: query }).then(r => r.data),
  options: () => http.get<OptionDto[]>('/labs/options').then(r => r.data),
  createLab: (name: string) => http.post<LabDto>('/labs', { name }).then(r => r.data),
  analyses: (query: PageQuery = {}) =>
    http.get<Page<AnalysisDto>>('/lab-analyses', { params: query }).then(r => r.data),
  createAnalysis: (req: AnalysisCreateRequest) =>
    http.post<AnalysisDto>('/lab-analyses', req).then(r => r.data)
}

export const warehousesApi = {
  list: (query: PageQuery = {}) =>
    http.get<Page<WarehouseDto>>('/warehouses', { params: query }).then(r => r.data),
  options: () => http.get<OptionDto[]>('/warehouses/options').then(r => r.data),
  create: (req: WarehouseCreateRequest) => http.post<WarehouseDto>('/warehouses', req).then(r => r.data),
  piles: (id: string) => http.get<PileDto[]>(`/warehouses/${id}/piles`).then(r => r.data)
}

export const dashboardApi = {
  get: () => http.get<DashboardDto>('/dashboard').then(r => r.data)
}

// Shared vocabulary for the batch free-text fields (product type, coal grade,
// fraction, quarry, deposit, mining site, supplier).
export const dictionaryApi = {
  list: () => http.get<DictionaryMap>('/dictionary').then(r => r.data),
  add: (field: DictionaryField, value: string) =>
    http.post<DictionaryEntryDto>('/dictionary', { field, value }).then(r => r.data)
}

export const qrImageUrl = (type: 'batch' | 'pile' | 'movement', id: string) =>
  `/api/qr/${type}/${id}.png`

// Public (no login) read of the whole passport, for the page a plain phone
// camera lands on after scanning the printed QR.
export const qrApi = {
  passport: (type: 'batch' | 'pile' | 'movement', id: string) =>
    http.get<QrPassportDto>(`/qr/${type}/${id}`).then(r => r.data)
}
