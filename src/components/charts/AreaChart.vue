<script setup lang="ts">
import { computed, useId } from 'vue'

export interface AreaSeries {
  name: string
  color: string
  values: (number | null)[]
}

const props = withDefaults(
  defineProps<{ labels: string[]; series: AreaSeries[]; height?: number; unit?: string }>(),
  { height: 250, unit: '' }
)

const uid = useId()
const W = 680
const PAD_L = 46
const PAD_R = 14
const PAD_T = 16
const PAD_B = 30

const scale = computed(() => {
  const present = props.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  if (!present.length) return null
  let min = Math.min(...present)
  let max = Math.max(...present)
  const pad = (max - min || Math.abs(max) || 1) * 0.2
  min = Math.max(0, min - pad)
  max = max + pad
  const innerW = W - PAD_L - PAD_R
  const innerH = props.height - PAD_T - PAD_B
  const n = Math.max(props.labels.length - 1, 1)
  const x = (i: number) => PAD_L + (i * innerW) / n
  const y = (v: number) => PAD_T + innerH - ((v - min) / (max - min)) * innerH
  const ticks = [0, 1, 2, 3, 4].map((t) => {
    const value = min + ((max - min) * t) / 4
    return { value, y: y(value) }
  })
  return { min, max, x, y, ticks, innerH }
})

function runs(values: (number | null)[]): number[][] {
  const out: number[][] = []
  let cur: number[] = []
  values.forEach((v, i) => {
    if (v === null) {
      if (cur.length) out.push(cur)
      cur = []
    } else {
      cur.push(i)
    }
  })
  if (cur.length) out.push(cur)
  return out
}

function smooth(pts: [number, number][]): string {
  if (pts.length === 1) return `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

const drawn = computed(() => {
  if (!scale.value) return []
  const { x, y } = scale.value
  const baseY = props.height - PAD_B
  return props.series.map((s, si) => {
    const paths = runs(s.values).map((run) => {
      const pts = run.map((i) => [x(i), y(s.values[i] as number)] as [number, number])
      const line = smooth(pts)
      const area =
        run.length > 1
          ? `${line} L${pts[pts.length - 1][0].toFixed(1)} ${baseY} L${pts[0][0].toFixed(1)} ${baseY} Z`
          : ''
      return { line, area, dots: pts }
    })
    return { ...s, gid: `${uid}-${si}`, paths }
  })
})

const labelStep = computed(() => Math.max(1, Math.ceil(props.labels.length / 7)))

function tickText(v: number): string {
  const r = Math.round(v * 10) / 10
  return (Number.isInteger(r) ? r.toString() : r.toFixed(1)) + props.unit
}
</script>

<template>
  <div class="w-full">
    <div class="chart-legend">
      <span v-for="s in series" :key="s.name" class="legend-item">
        <i :style="{ background: s.color, boxShadow: `0 0 8px ${s.color}` }"></i>{{ s.name }}
      </span>
    </div>
    <svg v-if="scale" :viewBox="`0 0 ${W} ${height}`" class="block h-auto w-full" role="img">
      <defs>
        <linearGradient v-for="s in drawn" :id="s.gid" :key="s.gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.32" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0.02" />
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
      <g v-for="s in drawn" :key="s.name">
        <path v-for="(p, pi) in s.paths" :key="'a' + pi" :d="p.area" :fill="`url(#${s.gid})`" />
        <path
          v-for="(p, pi) in s.paths"
          :key="'l' + pi"
          :d="p.line"
          fill="none"
          :stroke="s.color"
          stroke-width="2.2"
          stroke-linecap="round"
          :style="{ filter: `drop-shadow(0 0 6px ${s.color}66)` }"
        />
        <circle
          v-for="(d, di) in s.paths.flatMap((p) => p.dots)"
          :key="'d' + di"
          :cx="d[0]"
          :cy="d[1]"
          r="3"
          :fill="s.color"
          stroke="#050914"
          stroke-width="1.5"
        />
      </g>
      <g>
        <template v-for="(l, i) in labels" :key="i">
          <text
            v-if="i % labelStep === 0"
            :x="scale.x(i)"
            :y="height - 10"
            text-anchor="middle"
            fill="#7c8db5"
            font-size="10.5"
          >
            {{ l }}
          </text>
        </template>
      </g>
    </svg>
    <p v-else class="muted">Нет данных для графика</p>
  </div>
</template>
