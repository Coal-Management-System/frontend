import { reactive } from 'vue'

export type ToastKind = 'error' | 'success'

export interface Toast {
  id: number
  kind: ToastKind
  text: string
}

// Module-level store on purpose: toasts must survive view switches and render
// above modal backdrops (see ToastHost.vue, z-index 100 vs modal 50).
const toasts = reactive<Toast[]>([])
let seq = 0

export function dismissToast(id: number) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

export function pushToast(kind: ToastKind, text: string, ttl = 6000) {
  const id = ++seq
  toasts.push({ id, kind, text })
  window.setTimeout(() => dismissToast(id), ttl)
}

export function notifyError(text: string) {
  pushToast('error', text)
}

export function notifySuccess(text: string) {
  pushToast('success', text)
}

export function useToasts() {
  return { toasts, dismissToast }
}
