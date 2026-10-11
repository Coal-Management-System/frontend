<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{ values: (number | null)[]; color?: string; height?: number }>(),
  { color: '#22d3ee', height: 36 }
)

const W = 120
const uid = useId()

const drawn = computed(() => {
  const vals = props.values.filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const step = W / Math.max(props.values.length - 1, 1)
  const pts: [number, number][] = []
  props.values.forEach((v, i) => {
    if (v === null) return
    pts.push([i * step, props.height - 5 - ((v - min) / span) * (props.height - 12)])
  })
  if (pts.length === 1) {
    const y = pts[0][1]
    pts.unshift([0, y])
    pts.push([W, y])
  }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const area = `${line} L${last[0].toFixed(1)} ${props.height} L${pts[0][0].toFixed(1)} ${props.height} Z`
  return { line, area, last }
})
</script>

<template>
  <svg
    v-if="drawn"
    class="block h-full w-full"
    :viewBox="`0 0 ${W} ${height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="uid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="drawn.area" :fill="`url(#${uid})`" />
    <path :d="drawn.line" fill="none" :stroke="color" stroke-width="1.8" stroke-linecap="round" />
    <circle :cx="drawn.last[0]" :cy="drawn.last[1]" r="2.4" :fill="color" />
  </svg>
  <div v-else class="block h-full w-full"></div>
</template>
