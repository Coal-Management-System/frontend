import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import BatchesView from '@/views/BatchesView.vue'
import BatchPassportView from '@/views/BatchPassportView.vue'
import LabsView from '@/views/LabsView.vue'
import WarehousesView from '@/views/WarehousesView.vue'
import HeapsView from '@/views/HeapsView.vue'
import MovementsView from '@/views/MovementsView.vue'
import QrView from '@/views/QrView.vue'
import QrResolveView from '@/views/QrResolveView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/batches', name: 'batches', component: BatchesView },
    { path: '/batches/:id', name: 'batch-passport', component: BatchPassportView },
    { path: '/labs', name: 'labs', component: LabsView },
    { path: '/warehouses', name: 'warehouses', component: WarehousesView },
    { path: '/heaps', name: 'heaps', component: HeapsView },
    { path: '/movements', name: 'movements', component: MovementsView },
    { path: '/qr', name: 'qr', component: QrView },
    { path: '/qr/:type/:id', name: 'qr-resolve', component: QrResolveView }
  ]
})

export default router
