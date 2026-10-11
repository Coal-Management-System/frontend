<script setup lang="ts">
import { computed } from 'vue'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    segments: DonutSegment[]
    centerTitle?: string
    centerValue?: string
    size?: number
    thickness?: number
  }>(),
  { centerTitle: '', centerValue: '', size: 176, thickness: 16 }
)

const total = computed(() => props.segments.reduce((a, s) => a + s.value, 0))

const arcs = computed(() => {
  if (!total.value) return []
  const r = (props.size - props.thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total.value
      const gap = props.segments.filter((x) => x.value > 0).length > 1 ? 3 : 0
      const dash = Math.max(frac * c - gap, 1)
      const arc = { ...s, r, c, dash, offset: -offset, pct: Math.round(frac * 100) }
      offset += frac * c
      return arc
    })
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-5">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="(size - thickness) / 2"
        fill="none"
        stroke="rgba(99,141,255,0.12)"
        :stroke-width="thickness"
      />
      <g :transform="`rotate(-90 ${size / 2} ${size / 2})`">
        <circle
          v-for="a in arcs"
          :key="a.label"
          :cx="size / 2"
          :cy="size / 2"
          :r="a.r"
          fill="none"
          :stroke="a.color"
          :stroke-width="thickness"
          stroke-linecap="round"
          :stroke-dasharray="`${a.dash} ${a.c}`"
          :stroke-dashoffset="a.offset"
          :style="{ filter: `drop-shadow(0 0 6px ${a.color}88)`, transition: 'stroke-dasharray 0.4s ease' }"
        />
      </g>
      <text
        :x="size / 2"
        :y="size / 2 - 2"
        text-anchor="middle"
        fill="#eaf1ff"
        font-size="26"
        font-weight="700"
        class="tabular-nums"
      >
        {{ centerValue }}
      </text>
      <text
        :x="size / 2"
        :y="size / 2 + 16"
        text-anchor="middle"
        fill="#7c8db5"
        font-size="10.5"
        class="uppercase tracking-[0.06em]"
      >
        {{ centerTitle }}
      </text>
    </svg>
    <ul class="donut-legend">
      <li v-for="a in arcs" :key="a.label">
        <i :style="{ background: a.color, boxShadow: `0 0 8px ${a.color}` }"></i>
        <span class="dl-label">{{ a.label }}</span>
        <span class="dl-value">{{ a.value }} · {{ a.pct }}%</span>
      </li>
      <li v-if="!arcs.length" class="muted">Нет данных</li>
    </ul>
  </div>
</template>
