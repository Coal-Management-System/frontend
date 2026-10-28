<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import { getToken } from '@/lib/session'
import { roleLabels, shiftLabels } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const { user, logout, loadMe } = useAuth()
const { theme, toggle: toggleTheme } = useTheme()

const isLogin = computed(() => route.name === 'login')
// An anonymous visitor following a printed QR link gets a standalone page
// (no sidebar/topbar). Decided from the stored token so a signed-in user never
// sees a shell-less flash while loadMe() is still in flight.
const isAnonymousPublic = computed(() => route.meta.public === true && !getToken())
const initials = computed(() => {
  const parts = (user.value?.fullName ?? '').split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
})

async function onLogout() {
  await logout()
  await router.push('/login')
}

onMounted(() => {
  void loadMe()
})

const nav = [
  {
    to: '/dashboard',
    label: 'Дашборд',
    icon: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v4.5h-7zM13.5 11h7v9.5h-7zM3.5 13.5h7v7h-7z'
  },
  {
    to: '/batches',
    label: 'Учет партий',
    icon: 'M21 8l-9-4.5L3 8v8l9 4.5L21 16zM3 8l9 4.5L21 8M12 12.5v8'
  },
  {
    to: '/labs',
    label: 'Лаборатории',
    icon: 'M9.5 3h5M10.5 3v6.2L5.2 18a2.2 2.2 0 0 0 2 3.2h9.6a2.2 2.2 0 0 0 2-3.2L13.5 9.2V3M7.5 15h9'
  },
  {
    to: '/warehouses',
    label: 'Склады',
    icon: 'M3.5 7.5L5.5 3.5h13l2 4M3.5 7.5h17v13h-17zM9.5 12h5'
  },
  {
    to: '/piles',
    label: 'Штабели угля',
    icon: 'M2.5 20h19L15 6.5l-3.6 6.3-2.4-3.6z'
  },
  {
    to: '/movements',
    label: 'Движение продукции',
    icon: 'M7 8.5h11m0 0l-3-3m3 3l-3 3M17 15.5H6m0 0l3-3m-3 3l3 3'
  },
  {
    to: '/dictionary',
    label: 'Словари',
    icon: 'M5 4.5h9.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2zM5 4.5A1.5 1.5 0 0 0 6.5 6H16M9 10h5M9 13h5'
  },
  {
    to: '/qr',
    label: 'QR-кодирование',
    icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z'
  }
]

const currentLabel = computed(() => nav.find(n => n.to === route.path)?.label ?? 'Уголь и качество')
const today = new Date().toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})
</script>

<template>
  <RouterView v-if="isLogin" />
  <template v-else-if="isAnonymousPublic">
    <RouterView />
    <ToastHost />
  </template>
  <div v-else class="flex min-h-screen">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-logo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 19h18L14.5 6.5l-3.4 6-2.3-3.4z" />
          </svg>
        </span>
        <span class="brand-text">
          <b>Coal Transport</b>
          <i>Уголь и качество</i>
        </span>
      </div>
      <nav class="flex flex-col gap-1">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="item.icon" /></svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-foot">
        <div class="foot-card">
          <b>Этап 1</b>
          <span>Базовый модуль учета угля и качества</span>
        </div>
      </div>
    </aside>
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="topbar">
        <div class="crumb">
          <span class="crumb-dot"></span>
          {{ currentLabel }}
        </div>
        <div class="flex items-center gap-3">
          <button
            class="ghost btn-sm theme-toggle"
            :title="theme === 'dark' ? 'Светлая тема' : 'Темная тема'"
            :aria-label="theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'"
            @click="toggleTheme"
          >
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.5V2M12 22v-1.5M3.5 12H2M22 12h-1.5M5.6 5.6 4.5 4.5M19.5 19.5l-1.1-1.1M5.6 18.4l-1.1 1.1M19.5 4.5l-1.1 1.1M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5a8.5 8.5 0 1 0 11.3 11.3Z" />
            </svg>
          </button>
          <span class="chip-date">{{ today }}</span>
          <span class="user-chip">
            <span class="avatar">{{ initials }}</span>
            <span class="user-meta">
              <b>{{ user?.fullName ?? 'Загрузка…' }}</b>
              <i>
                {{
                  user
                    ? `${roleLabels[user.role]} · ${shiftLabels[user.shift]}`
                    : ''
                }}
              </i>
            </span>
          </span>
          <button class="secondary" @click="onLogout">Выйти</button>
        </div>
      </header>
      <main class="content">
        <RouterView />
      </main>
    </div>
    <ToastHost />
  </div>
</template>
