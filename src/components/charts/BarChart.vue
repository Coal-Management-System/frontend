<script setup lang="ts">
import { computed, useId } from 'vue'

export interface BarItem {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{ bars: BarItem[]; height?: number; unit?: string }>(),
  { height: 240, unit: '' }
)

const uid = useId()
const W = 560
const PAD_L = 46
const PAD_R = 12
const PAD_T = 22
const PAD_B = 34

const scale = computed(() => {
  const max = Math.max(...props.bars.map((b) => b.value), 0)
  if (!max) return null
  const nice = niceCeil(max)
  const innerW = W - PAD_L - PAD_R
  const innerH = props.height - PAD_T - PAD_B
  const slot = innerW / Math.max(props.bars.length, 1)
  const barW = Math.min(slot * 0.44, 64)
  const y = (v: number) => PAD_T + innerH - (v / nice) * innerH
  const ticks = [0, 1, 2, 3, 4].map((t) => {
    const value = (nice * t) / 4
    return { value, y: y(value) }
  })
  return { nice, slot, barW, y, ticks, baseY: PAD_T + innerH }
})

function niceCeil(v: number): number {
  const pow = 10 ** Math.floor(Math.log10(v))
  const frac = v / pow
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10
  return nice * pow
}

const drawn = computed(() => {
  if (!scale.value) return []
  const { slot, barW, y, baseY } = scale.value
  return props.bars.map((b, i) => {
    const cx = PAD_L + slot * i + slot / 2
    const x = cx - barW / 2
    const top = y(b.value)
    const r = Math.min(7, barW / 2, Math.max(baseY - top, 0))
    const d =
      b.value > 0
        ? `M${x} ${baseY} L${x} ${top + r} Q${x} ${top} ${x + r} ${top} L${x + barW - r} ${top} Q${x + barW} ${top} ${x + barW} ${top + r} L${x + barW} ${baseY} Z`
        : ''
    return { ...b, x, cx, top, d, gid: `${uid}-${i}` }
  })
})

function tickText(v: number): string {
  return v.toLocaleString('ru-RU') + props.unit
}
</script>

<template>
  <svg v-if="scale" :viewBox="`0 0 ${W} ${height}`" class="block h-auto w-full" role="img">
    <defs>
      <linearGradient v-for="b in drawn" :id="b.gid" :key="b.gid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="b.color" stop-opacity="0.9" />
        <stop offset="100%" :stop-color="b.color" stop-opacity="0.18" />
      </linearGradient>
    </defs>
    <g>
      <template v-for="(t, i) in scale.ticks" :key="i">
        <line
          :x1="PAD_L"
          :x2="W - PAD_R"
          :y1="t.y"
          :y2="t.y"
          stroke="rgba(99, 141, 255, 0.12)"
          stroke-dasharray="3 5"
        />
        <text :x="PAD_L - 8" :y="t.y + 3.5" text-anchor="end" fill="#7c8db5" font-size="10.5">
          {{ tickText(t.value) }}
        </text>
      </template>
    </g>
    <g v-for="b in drawn" :key="b.label">
      <path
        v-if="b.d"
        :d="b.d"
        :fill="`url(#${b.gid})`"
        :style="{ filter: `drop-shadow(0 0 8px ${b.color}55)` }"
      />
      <text
        :x="b.cx"
        :y="b.top - 8"
        text-anchor="middle"
        fill="#eaf1ff"
        font-size="11.5"
        font-weight="600"
        class="tabular-nums"
      >
        {{ b.value.toLocaleString('ru-RU') }}
      </text>
      <text :x="b.cx" :y="height - 12" text-anchor="middle" fill="#7c8db5" font-size="10.5">
        {{ b.label }}
      </text>
    </g>
  </svg>
  <p v-else class="muted">Нет данных для графика</p>
</template>
