import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import BatchesView from '@/views/BatchesView.vue'
import BatchPassportView from '@/views/BatchPassportView.vue'
import LabsView from '@/views/LabsView.vue'
import LoginView from '@/views/LoginView.vue'
import WarehousesView from '@/views/WarehousesView.vue'
import PilesView from '@/views/PilesView.vue'
import MovementsView from '@/views/MovementsView.vue'
import QrView from '@/views/QrView.vue'
import QrResolveView from '@/views/QrResolveView.vue'
import { getToken } from '@/lib/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/batches', name: 'batches', component: BatchesView },
    { path: '/batches/:id', name: 'batch-passport', component: BatchPassportView },
    { path: '/labs', name: 'labs', component: LabsView },
    { path: '/warehouses', name: 'warehouses', component: WarehousesView },
    { path: '/piles', name: 'piles', component: PilesView },
    { path: '/movements', name: 'movements', component: MovementsView },
    { path: '/qr', name: 'qr', component: QrView },
    { path: '/qr/:type/:id', name: 'qr-resolve', component: QrResolveView }
  ]
})

router.beforeEach((to) => {
  const authed = !!getToken()
  if (!authed && to.name !== 'login') {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  if (authed && to.name === 'login') {
    return { name: 'dashboard' }
  }
  return true
})

export default router
