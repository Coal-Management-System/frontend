import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import BatchesView from '@/views/BatchesView.vue'
import BatchPassportView from '@/views/BatchPassportView.vue'
import LabsView from '@/views/LabsView.vue'
import LoginView from '@/views/LoginView.vue'
import WarehousesView from '@/views/WarehousesView.vue'
import PilesView from '@/views/PilesView.vue'
import MovementsView from '@/views/MovementsView.vue'
import DictionaryView from '@/views/DictionaryView.vue'
import QrView from '@/views/QrView.vue'
import QrResolveView from '@/views/QrResolveView.vue'
import QrActionView from '@/views/QrActionView.vue'
import { getToken } from '@/lib/session'
import { useAuth } from '@/composables/useAuth'
import { canSee, sectionsFor, type Section } from '@/lib/access'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    standalone?: boolean
    section?: Section
  }
}

const sectionPaths: Record<Section, string> = {
  dashboard: '/dashboard',
  batches: '/batches',
  labs: '/labs',
  warehouses: '/warehouses',
  piles: '/piles',
  movements: '/movements',
  dictionary: '/dictionary',
  qr: '/qr'
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { section: 'dashboard' } },
    { path: '/batches', name: 'batches', component: BatchesView, meta: { section: 'batches' } },
    { path: '/batches/:id', name: 'batch-passport', component: BatchPassportView, meta: { section: 'batches' } },
    { path: '/labs', name: 'labs', component: LabsView, meta: { section: 'labs' } },
    { path: '/warehouses', name: 'warehouses', component: WarehousesView, meta: { section: 'warehouses' } },
    { path: '/piles', name: 'piles', component: PilesView, meta: { section: 'piles' } },
    { path: '/movements', name: 'movements', component: MovementsView, meta: { section: 'movements' } },
    { path: '/dictionary', name: 'dictionary', component: DictionaryView, meta: { section: 'dictionary' } },
    { path: '/qr', name: 'qr', component: QrView, meta: { section: 'qr' } },
    // Needs a login, unlike the passport below: scanning this one changes volumes.
    { path: '/qr/action/:id', name: 'qr-action', component: QrActionView, meta: { standalone: true, section: 'qr' } },
    { path: '/qr/:type/:id', name: 'qr-resolve', component: QrResolveView, meta: { public: true } }
  ]
})

router.beforeEach(async (to) => {
  const authed = !!getToken()
  // The QR passport page is opened by plain phone cameras with no session;
  // its backing /api/qr/** endpoints are public, so let it through unauthed.
  if (!authed && to.meta.public) {
    return true
  }
  if (!authed && to.name !== 'login') {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  if (authed && to.name === 'login') {
    return { name: 'dashboard' }
  }
  const section = to.meta.section
  if (authed && section) {
    const { user, loadMe } = useAuth()
    const me = user.value ?? (await loadMe())
    if (!me) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (!canSee(me.role, section)) {
      const home = sectionsFor(me.role)[0]
      // Without this check a role with no sections would redirect forever.
      return home && home !== section ? sectionPaths[home] : false
    }
  }
  return true
})

export default router
