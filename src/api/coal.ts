import { http } from './client'
import type {
  AnalysisCreateRequest,
  AnalysisDto,
  BatchCreateRequest,
  BatchDto,
  BatchUpdateRequest,
  DashboardDto,
  HeapCreateRequest,
  HeapDto,
  HeapMergeRequest,
  HeapSplitRequest,
  HeapTransferRequest,
  LabDto,
  MovementCreateRequest,
  MovementDto,
  QualityHistoryRow,
  WarehouseCreateRequest,
  WarehouseDto
} from './types'

export const batchesApi = {
  list: () => http.get<BatchDto[]>('/batches').then(r => r.data),
  get: (id: string) => http.get<BatchDto>(`/batches/${id}`).then(r => r.data),
  create: (req: BatchCreateRequest) => http.post<BatchDto>('/batches', req).then(r => r.data),
  update: (id: string, req: BatchUpdateRequest) =>
    http.put<BatchDto>(`/batches/${id}`, req).then(r => r.data),
  qualityHistory: (id: string) =>
    http.get<QualityHistoryRow[]>(`/batches/${id}/quality-history`).then(r => r.data)
}

export const heapsApi = {
  list: () => http.get<HeapDto[]>('/heaps').then(r => r.data),
  get: (id: string) => http.get<HeapDto>(`/heaps/${id}`).then(r => r.data),
  create: (req: HeapCreateRequest) => http.post<HeapDto>('/heaps', req).then(r => r.data),
  history: (id: string) => http.get<MovementDto[]>(`/heaps/${id}/history`).then(r => r.data),
  split: (id: string, req: HeapSplitRequest) =>
    http.post<HeapDto>(`/heaps/${id}/split`, req).then(r => r.data),
  merge: (req: HeapMergeRequest) => http.post<HeapDto>('/heaps/merge', req).then(r => r.data),
  transfer: (id: string, req: HeapTransferRequest) =>
    http.post<HeapDto>(`/heaps/${id}/transfer`, req).then(r => r.data)
}

export const movementsApi = {
  list: () => http.get<MovementDto[]>('/movements').then(r => r.data),
  create: (req: MovementCreateRequest) => http.post<MovementDto>('/movements', req).then(r => r.data)
}

export const labsApi = {
  labs: () => http.get<LabDto[]>('/labs').then(r => r.data),
  createLab: (name: string) => http.post<LabDto>('/labs', { name }).then(r => r.data),
  analyses: (batchId?: string) =>
    http
      .get<AnalysisDto[]>('/lab-analyses', { params: batchId ? { batchId } : {} })
      .then(r => r.data),
  createAnalysis: (req: AnalysisCreateRequest) =>
    http.post<AnalysisDto>('/lab-analyses', req).then(r => r.data)
}

export const warehousesApi = {
  list: () => http.get<WarehouseDto[]>('/warehouses').then(r => r.data),
  create: (req: WarehouseCreateRequest) => http.post<WarehouseDto>('/warehouses', req).then(r => r.data),
  heaps: (id: string) => http.get<HeapDto[]>(`/warehouses/${id}/heaps`).then(r => r.data)
}

export const dashboardApi = {
  get: () => http.get<DashboardDto>('/dashboard').then(r => r.data)
}

export const qrImageUrl = (type: 'batch' | 'heap' | 'movement', id: string) =>
  `/api/qr/${type}/${id}.png`
