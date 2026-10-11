<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  batchesApi,
  dashboardApi,
  heapsApi,
  labsApi,
  movementsApi,
  warehousesApi,
} from "@/api/coal";
import type {
  AnalysisDto,
  BatchDto,
  DashboardDto,
  HeapDto,
  MovementDto,
  MovementOperation,
  WarehouseDto,
} from "@/api/types";
import {
  batchStatusLabels,
  fmt,
  fmtDate,
  operationLabels,
  originLabels,
} from "@/lib/format";
import AreaChart from "@/components/charts/AreaChart.vue";
import BarChart from "@/components/charts/BarChart.vue";
import DonutChart from "@/components/charts/DonutChart.vue";
import Sparkline from "@/components/charts/Sparkline.vue";

const dash = ref<DashboardDto | null>(null);
const batches = ref<BatchDto[]>([]);
const heaps = ref<HeapDto[]>([]);
const movements = ref<MovementDto[]>([]);
const analyses = ref<AnalysisDto[]>([]);
const warehouses = ref<WarehouseDto[]>([]);
const error = ref("");
const loading = ref(true);

const icons = {
  pick: "M14 4l6 6M3 21l9.5-9.5M14 4l-2.5 2.5L17.5 12 20 9.5zM11.5 6.5L8 3l-2 2 3.5 3.5",
  box: "M21 8l-9-4.5L3 8v8l9 4.5L21 16zM3 8l9 4.5L21 8M12 12.5v8",
  flask:
    "M9.5 3h5M10.5 3v6.2L5.2 18a2.2 2.2 0 0 0 2 3.2h9.6a2.2 2.2 0 0 0 2-3.2L13.5 9.2V3M7.5 15h9",
  flame:
    "M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-2 1-3.6 2-4.8 0 0 .4 2.3 2 2.8C11.6 8.4 12 5.4 12 3z",
  truck:
    "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 19zM17.5 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z",
  created: "M12 5v14M5 12h14",
  merged: "M7 5l5 5 5-5M12 10v9M7 19h10",
  split: "M12 19v-7M12 12L7 6M12 12l5-6M5 20h4M15 20h4",
  transferred: "M7 8.5h11m0 0l-3-3m3 3l-3 3M17 15.5H6m0 0l3-3m-3 3l3 3",
} as const;

const opMeta: Record<
  MovementOperation,
  { color: string; icon: keyof typeof icons; short: string }
> = {
  PILE_CREATED: { color: "#22d3ee", icon: "created", short: "Создание" },
  PILE_MERGED: { color: "#60a5fa", icon: "merged", short: "Слияние" },
  PILE_SPLIT: { color: "#a78bfa", icon: "split", short: "Разделение" },
  PILE_TRANSFERRED: {
    color: "#fbbf24",
    icon: "transferred",
    short: "Трансфер",
  },
};

const kpiCard =
  "relative overflow-hidden rounded-panel border border-line bg-[linear-gradient(160deg,rgba(19,31,63,0.62),rgba(8,14,30,0.86))] p-4 shadow-panel";
const kpiIconBox =
  "grid size-9.5 shrink-0 place-items-center rounded-[11px] border";
const kpiGlow =
  "pointer-events-none absolute -bottom-[60%] -right-[30%] h-[90%] w-[70%]";
const kpiValue =
  "mt-2.5 text-[1.7rem] font-bold tracking-[0.01em] tabular-nums";
const kpiTone = {
  cyan: {
    icon: "border-neon-cyan/40 bg-[linear-gradient(140deg,rgba(34,211,238,0.25),rgba(59,130,246,0.18))] text-neon-cyan shadow-[0_0_16px_rgba(34,211,238,0.25)]",
    glow: "bg-[radial-gradient(closest-side,rgba(34,211,238,0.25),transparent)]",
  },
  blue: {
    icon: "border-neon-blue/40 bg-[linear-gradient(140deg,rgba(96,165,250,0.25),rgba(59,130,246,0.14))] text-neon-blue shadow-[0_0_16px_rgba(96,165,250,0.25)]",
    glow: "bg-[radial-gradient(closest-side,rgba(96,165,250,0.25),transparent)]",
  },
  violet: {
    icon: "border-neon-violet/40 bg-[linear-gradient(140deg,rgba(167,139,250,0.25),rgba(139,92,246,0.14))] text-neon-violet shadow-[0_0_16px_rgba(167,139,250,0.25)]",
    glow: "bg-[radial-gradient(closest-side,rgba(167,139,250,0.25),transparent)]",
  },
  amber: {
    icon: "border-neon-amber/40 bg-[linear-gradient(140deg,rgba(251,191,36,0.25),rgba(245,158,11,0.14))] text-neon-amber shadow-[0_0_16px_rgba(251,191,36,0.22)]",
    glow: "bg-[radial-gradient(closest-side,rgba(251,191,36,0.22),transparent)]",
  },
  green: {
    icon: "border-neon-green/40 bg-[linear-gradient(140deg,rgba(52,211,153,0.25),rgba(16,185,129,0.14))] text-neon-green shadow-[0_0_16px_rgba(52,211,153,0.22)]",
    glow: "bg-[radial-gradient(closest-side,rgba(52,211,153,0.22),transparent)]",
  },
} as const;

const statusMeta = [
  { status: "NEW" as const, color: "#22d3ee", tone: "tone-cyan" },
  { status: "IN_PROCESSING" as const, color: "#a78bfa", tone: "tone-violet" },
  {
    status: "READY_FOR_SHIPMENT" as const,
    color: "#34d399",
    tone: "tone-green",
  },
  { status: "SHIPPED" as const, color: "#60a5fa", tone: "tone-blue" },
];

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}
function dayLabel(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}`;
}

const quality = computed(() => {
  const byDay = new Map<string, { ash: number[]; moisture: number[] }>();
  for (const a of analyses.value) {
    if (!a.analysisDate) continue;
    const key = dayKey(a.analysisDate);
    const row = byDay.get(key) ?? { ash: [], moisture: [] };
    for (const v of a.values) {
      if (v.indicator === "ASH") row.ash.push(v.value);
      if (v.indicator === "MOISTURE") row.moisture.push(v.value);
    }
    byDay.set(key, row);
  }
  const keys = [...byDay.keys()].sort();
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  return {
    labels: keys.map(dayLabel),
    ash: keys.map((k) => avg(byDay.get(k)!.ash)),
    moisture: keys.map((k) => avg(byDay.get(k)!.moisture)),
  };
});

const calorificSeries = computed(() => {
  const rows = analyses.value
    .filter((a) => a.analysisDate)
    .sort((a, b) => (a.analysisDate! < b.analysisDate! ? -1 : 1));
  return rows.map(
    (a) => a.values.find((v) => v.indicator === "CALORIFIC")?.value ?? null,
  );
});

const minedSeries = computed(() => {
  const byDay = new Map<string, number>();
  for (const b of batches.value) {
    if (!b.minedAt) continue;
    const key = dayKey(b.minedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + b.initialWeight);
  }
  return [...byDay.keys()].sort().map((k) => byDay.get(k)!);
});

const statusSegments = computed(() =>
  statusMeta.map((m) => ({
    label: batchStatusLabels[m.status],
    color: m.color,
    value: batches.value.filter((b) => b.status === m.status).length,
  })),
);

const opBars = computed(() =>
  (Object.keys(opMeta) as MovementOperation[]).map((op) => ({
    label: opMeta[op].short,
    color: opMeta[op].color,
    value: movements.value
      .filter((m) => m.operation === op)
      .reduce((a, m) => a + m.volume, 0),
  })),
);

const warehouseLoad = computed(() => {
  const rows = warehouses.value.map((w) => ({
    w,
    volume: heaps.value
      .filter((h) => h.warehouseId === w.id)
      .reduce((a, h) => a + h.volume, 0),
    heapCount: heaps.value.filter((h) => h.warehouseId === w.id).length,
  }));
  const max = Math.max(...rows.map((r) => r.volume), 1);
  const total = rows.reduce((a, r) => a + r.volume, 0);
  return {
    rows: rows.map((r) => ({
      ...r,
      pct: (r.volume / max) * 100,
      share: total ? Math.round((r.volume / total) * 100) : 0,
    })),
    total,
  };
});

const feed = computed(() =>
  [...movements.value]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6)
    .map((m) => ({
      ...m,
      meta: opMeta[m.operation],
      route: [m.fromLocation, m.toLocation].filter(Boolean).join(" → "),
    })),
);

const recentBatches = computed(() =>
  [...batches.value]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6),
);

function statusTone(status: BatchDto["status"]): string {
  return statusMeta.find((m) => m.status === status)?.tone ?? "tone-gray";
}

function originOf(b: BatchDto): string {
  return b.originType === "PURCHASED"
    ? b.supplier || "Поставщик"
    : b.miningSite || b.deposit || "—";
}

onMounted(async () => {
  try {
    const [d, b, h, m, a, w] = await Promise.all([
      dashboardApi.get(),
      batchesApi.list(),
      heapsApi.list(),
      movementsApi.list(),
      labsApi.analyses(),
      warehousesApi.list(),
    ]);
    dash.value = d;
    batches.value = b;
    heaps.value = h;
    movements.value = m;
    analyses.value = a;
    warehouses.value = w;
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <div class="toolbar">
      <div>
        <h1>Дашборд производства</h1>
        <!-- <p class="subtitle">
          Учет угля и качества: добыча, склады, лаборатории и движение продукции
        </p> -->
      </div>
      <RouterLink to="/batches" class="btn secondary btn-sm">
        Учет партий
      </RouterLink>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-else-if="dash">
      <div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
        <div :class="kpiCard">
          <span :class="[kpiGlow, kpiTone.cyan.glow]"></span>
          <div class="flex items-center gap-2.5">
            <span :class="[kpiIconBox, kpiTone.cyan.icon]">
              <svg
                viewBox="0 0 24 24"
                class="size-[19px]"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="icons.pick" />
              </svg>
            </span>
            <span class="text-[0.78rem] text-mute">Добыто сегодня, т</span>
          </div>
          <div :class="kpiValue">{{ fmt(dash.minedToday) }}</div>
          <div class="mt-1.5 text-xs text-mute">
            {{ dash.batchCount }} партий · {{ dash.heapCount }} куч в учете
          </div>
          <span class="absolute right-3.5 bottom-3 h-10 w-[118px] opacity-90">
            <Sparkline :values="minedSeries" color="#22d3ee" />
          </span>
        </div>
        <div :class="kpiCard">
          <span :class="[kpiGlow, kpiTone.blue.glow]"></span>
          <div class="flex items-center gap-2.5">
            <span :class="[kpiIconBox, kpiTone.blue.icon]">
              <svg
                viewBox="0 0 24 24"
                class="size-[19px]"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="icons.box" />
              </svg>
            </span>
            <span class="text-[0.78rem] text-mute">Общий остаток, т</span>
          </div>
          <div :class="kpiValue">{{ fmt(dash.totalRemainder) }}</div>
          <div class="mt-1.5 text-xs text-mute">
            свободный объем {{ fmt(dash.freeVolume) }} т
          </div>
        </div>
        <div :class="kpiCard">
          <span :class="[kpiGlow, kpiTone.violet.glow]"></span>
          <div class="flex items-center gap-2.5">
            <span :class="[kpiIconBox, kpiTone.violet.icon]">
              <svg
                viewBox="0 0 24 24"
                class="size-[19px]"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="icons.flask" />
              </svg>
            </span>
            <span class="text-[0.78rem] text-mute">Передано в переработку, т</span>
          </div>
          <div :class="kpiValue">{{ fmt(dash.transferredToProcessing) }}</div>
          <div class="mt-1.5 text-xs text-mute">потери {{ fmt(dash.losses) }} т</div>
        </div>
        <div :class="kpiCard">
          <span :class="[kpiGlow, kpiTone.cyan.glow]"></span>
          <div class="flex items-center gap-2.5">
            <span :class="[kpiIconBox, kpiTone.cyan.icon]">
              <svg
                viewBox="0 0 24 24"
                class="size-[19px]"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="icons.flame" />
              </svg>
            </span>
            <span class="text-[0.78rem] text-mute">Средняя зольность, %</span>
          </div>
          <div :class="kpiValue">{{ fmt(dash.avgAsh) }}</div>
          <div class="mt-1.5 text-xs text-mute">
            влажность {{ fmt(dash.avgMoisture) }} %
          </div>
        </div>
        <div :class="kpiCard">
          <span :class="[kpiGlow, kpiTone.amber.glow]"></span>
          <div class="flex items-center gap-2.5">
            <span :class="[kpiIconBox, kpiTone.amber.icon]">
              <svg
                viewBox="0 0 24 24"
                class="size-[19px]"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="icons.flame" />
              </svg>
            </span>
            <span class="text-[0.78rem] text-mute">Средняя калорийность, ккал</span>
          </div>
          <div :class="kpiValue">{{ fmt(dash.avgCalorific) }}</div>
          <div class="mt-1.5 text-xs text-mute">по протоколам лабораторий</div>
          <span class="absolute right-3.5 bottom-3 h-10 w-[118px] opacity-90">
            <Sparkline :values="calorificSeries" color="#fbbf24" />
          </span>
        </div>
        <div :class="kpiCard">
          <span :class="[kpiGlow, kpiTone.green.glow]"></span>
          <div class="flex items-center gap-2.5">
            <span :class="[kpiIconBox, kpiTone.green.icon]">
              <svg
                viewBox="0 0 24 24"
                class="size-[19px]"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="icons.truck" />
              </svg>
            </span>
            <span class="text-[0.78rem] text-mute">Готово к отгрузке, т</span>
          </div>
          <div :class="kpiValue">{{ fmt(dash.readyForShipment) }}</div>
          <div class="mt-1.5 text-xs text-mute">
            зарезервировано {{ fmt(dash.reservedVolume) }} т
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-12 items-start gap-4">
        <section class="panel col-span-12 desk:col-span-7">
          <div class="panel-head">
            <h2>Динамика качества</h2>
            <span class="hint">средние значения по протоколам, %</span>
          </div>
          <AreaChart
            :labels="quality.labels"
            :series="[
              { name: 'Зольность', color: '#22d3ee', values: quality.ash },
              { name: 'Влажность', color: '#a78bfa', values: quality.moisture },
            ]"
            :height="270"
            unit="%"
          />
        </section>

        <section class="panel col-span-12 desk:col-span-5">
          <div class="panel-head">
            <h2>Статусы партий</h2>
            <span class="hint">{{ batches.length }} всего</span>
          </div>
          <DonutChart
            :segments="statusSegments"
            :center-value="String(batches.length)"
            center-title="партий"
          />
        </section>

        <section class="panel col-span-12 desk:col-span-7">
          <div class="panel-head">
            <h2>Объемы по операциям</h2>
            <span class="hint">тонн</span>
          </div>
          <BarChart :bars="opBars" unit="" />
        </section>

        <section class="panel col-span-12 desk:col-span-5">
          <div class="panel-head">
            <h2>Последние движения</h2>
            <RouterLink to="/movements" class="hint">все →</RouterLink>
          </div>
          <div v-if="feed.length" class="feed">
            <div v-for="m in feed" :key="m.id" class="feed-item">
              <span
                class="feed-icon"
                :style="{
                  color: m.meta.color,
                  borderColor: m.meta.color + '55',
                  background: m.meta.color + '14',
                }"
              >
                <svg viewBox="0 0 24 24"><path :d="icons[m.meta.icon]" /></svg>
              </span>
              <span class="feed-text">
                <b
                  >{{ operationLabels[m.operation]
                  }}{{ m.heapNumber ? " · " + m.heapNumber : "" }}</b
                >
                <span>{{ m.route || "—" }} · {{ fmtDate(m.createdAt) }}</span>
              </span>
              <span class="feed-val" :style="{ color: m.meta.color }"
                >{{ fmt(m.volume) }} т</span
              >
            </div>
          </div>
          <p v-else class="muted">Движений пока нет</p>
        </section>

        <section class="panel col-span-12">
          <div class="panel-head">
            <h2>Последние партии</h2>
            <RouterLink to="/batches" class="hint">все партии →</RouterLink>
          </div>
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Источник</th>
                <th class="num">Остаток, т</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in recentBatches" :key="b.id">
                <td>{{ b.batchNumber }}</td>
                <td>{{ originLabels[b.originType] }} · {{ originOf(b) }}</td>
                <td class="num">{{ fmt(b.currentRemainder) }}</td>
                <td>
                  <span class="pill" :class="statusTone(b.status)">{{
                    batchStatusLabels[b.status]
                  }}</span>
                </td>
                <td class="num">
                  <RouterLink
                    :to="`/batches/${b.id}`"
                    class="btn secondary btn-sm"
                    >Паспорт</RouterLink
                  >
                </td>
              </tr>
              <tr v-if="!recentBatches.length">
                <td colspan="5" class="muted">Партий пока нет</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel col-span-12 desk:col-span-5">
          <div class="panel-head">
            <h2>Загрузка складов</h2>
            <span class="hint"
              >{{ fmt(warehouseLoad.total) }} т на хранении</span
            >
          </div>
          <div v-if="warehouseLoad.rows.length">
            <div v-for="r in warehouseLoad.rows" :key="r.w.id" class="bar-row">
              <span class="name">{{ r.w.number }}</span>
              <span class="bar-track"
                ><span class="bar-fill" :style="{ width: r.pct + '%' }"></span
              ></span>
              <span class="val">{{ fmt(r.volume) }} т</span>
            </div>
            <p class="muted mt-2.5 mb-0 text-xs">
              Доля запасов:
              <template v-for="(r, i) in warehouseLoad.rows" :key="r.w.id">
                {{ i ? " · " : "" }}{{ r.w.number }} — {{ r.share }}% ({{
                  r.heapCount
                }}
                куч)
              </template>
            </p>
          </div>
          <p v-else class="muted">Складов пока нет</p>
        </section>

        <section class="panel col-span-12 desk:col-span-7">
          <div class="panel-head">
            <h2>Сводка</h2>
          </div>
          <div class="grid grid-cols-2 gap-3 desk:grid-cols-4">
            <div class="mini">
              <div class="label">Партии с отклонениями</div>
              <div class="value">
                <span
                  class="pill"
                  :class="
                    dash.batchesWithDeviations ? 'tone-red' : 'tone-green'
                  "
                >
                  {{ dash.batchesWithDeviations }}
                </span>
              </div>
            </div>
            <div class="mini">
              <div class="label">Потери, т</div>
              <div class="value">{{ fmt(dash.losses) }}</div>
            </div>
            <div class="mini">
              <div class="label">Зарезервировано, т</div>
              <div class="value">{{ fmt(dash.reservedVolume) }}</div>
            </div>
            <div class="mini">
              <div class="label">Складов / лабораторий</div>
              <div class="value">
                {{ dash.warehouseCount }} / {{ dash.labCount }}
              </div>
            </div>
          </div>
          <p class="muted mt-3.5 mb-0 text-xs">
            Показатели «Выход концентрата», «Себестоимость» и «Прибыль на тонну»
            появятся вместе с модулем переработки и ценообразованием.
          </p>
        </section>
      </div>
    </template>
    <p v-else class="muted">Загрузка…</p>
  </div>
</template>
