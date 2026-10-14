<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { dashboardApi } from "@/api/coal";
import type { DashboardDto } from "@/api/types";
import { fmt } from "@/lib/format";
import StatCard from "@/components/dashboard/StatCard.vue";
import StatSection from "@/components/dashboard/StatSection.vue";

const dash = ref<DashboardDto | null>(null);
const error = ref("");
const cardsRoot = ref<HTMLElement | null>(null);

function metric(
  v: number | null,
  unit: string,
): { value: string; unit: string } {
  return v == null ? { value: "—", unit: "" } : { value: fmt(v), unit };
}

function syncCardHeights() {
  const root = cardsRoot.value;
  if (!root) return;
  root.style.removeProperty("--card-h"); // back to natural heights
  const cards = root.querySelectorAll<HTMLElement>(".stat-card");
  const max = Math.max(0, ...Array.from(cards, (c) => c.offsetHeight));
  root.style.setProperty("--card-h", `${max}px`);
}

// resync only when width changes (text wrapping), avoids RO feedback loops
let ro: ResizeObserver | null = null;
let lastWidth = 0;

watch(cardsRoot, (el, _, onCleanup) => {
  if (!el) return;
  syncCardHeights();
  document.fonts?.ready.then(syncCardHeights); // web fonts can change height
  ro = new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width);
    if (w === lastWidth) return;
    lastWidth = w;
    requestAnimationFrame(syncCardHeights);
  });
  ro.observe(el);
  onCleanup(() => ro?.disconnect());
});

onBeforeUnmount(() => ro?.disconnect());

onMounted(async () => {
  try {
    dash.value = await dashboardApi.get();
  } catch (e) {
    error.value = String(e);
  }
});
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1>Общая информация</h1>
      <RouterLink
        to="/batches"
        class="inline-flex items-center rounded-[10px] border border-line bg-neon-blue/8 px-3.5 py-2 text-[0.85rem] font-semibold text-ink transition-colors hover:border-neon-cyan/50 hover:text-neon-cyan"
      >
        Учет партий
      </RouterLink>
    </div>
    <p v-if="error" class="text-sm text-neon-red">{{ error }}</p>

    <div
      v-else-if="dash"
      ref="cardsRoot"
      class="grid gap-6 desk:grid-cols-2 desk:items-start"
    >
      <div class="flex flex-col gap-7">
        <StatSection title="Производство">
          <StatCard
            label="Добыто сегодня"
            :value="fmt(dash.minedToday)"
            unit="т"
            tone="cyan"
            :hint="`${dash.batchCount} партий · ${dash.heapCount} куч в учете`"
          />
          <StatCard
            label="Передано в переработку"
            :value="fmt(dash.transferredToProcessing)"
            unit="т"
            tone="violet"
          />
          <StatCard
            label="Переработано"
            value="—"
            tone="blue"
            hint="модуль переработки — этап 2"
          />
          <StatCard
            label="Выпуск продукции"
            value="—"
            tone="green"
            hint="модуль переработки — этап 2"
          />
        </StatSection>

        <StatSection title="Склады">
          <StatCard
            label="Общий остаток"
            :value="fmt(dash.totalRemainder)"
            unit="т"
            tone="blue"
          />
          <StatCard
            label="Свободный объем"
            :value="fmt(dash.freeVolume)"
            unit="т"
            tone="cyan"
          />
          <StatCard
            label="Зарезервированный объем"
            :value="fmt(dash.reservedVolume)"
            unit="т"
            tone="amber"
          />
          <StatCard
            label="Готовая к отгрузке продукция"
            :value="fmt(dash.readyForShipment)"
            unit="т"
            tone="green"
          />
        </StatSection>
      </div>

      <div class="flex flex-col gap-7">
        <StatSection title="Качество">
          <StatCard
            label="Средняя зольность"
            v-bind="metric(dash.avgAsh, '%')"
            tone="cyan"
          />
          <StatCard
            label="Средняя влажность"
            v-bind="metric(dash.avgMoisture, '%')"
            tone="blue"
          />
          <StatCard
            label="Калорийность"
            v-bind="metric(dash.avgCalorific, 'ккал')"
            tone="amber"
            hint="по протоколам лабораторий"
          />
          <StatCard
            label="Партии с отклонениями"
            :value="dash.batchesWithDeviations"
            :tone="dash.batchesWithDeviations ? 'red' : 'green'"
          />
        </StatSection>

        <StatSection title="Эффективность">
          <StatCard
            label="Выход концентрата"
            v-bind="metric(dash.concentrateYield, '%')"
            tone="violet"
            hint="по модулю переработки — этап 2"
          />
          <StatCard
            label="Потери"
            :value="fmt(dash.losses)"
            unit="т"
            tone="red"
          />
          <StatCard
            label="Себестоимость"
            v-bind="metric(dash.costPerTon, 'сум/т')"
            tone="amber"
            hint="модуль ценообразования — этап 2"
          />
          <StatCard
            label="Прибыль на тонну"
            v-bind="metric(dash.profitPerTon, 'сум/т')"
            tone="green"
            hint="модуль ценообразования — этап 2"
          />
        </StatSection>
      </div>
    </div>
    <p v-else class="text-sm text-mute">Загрузка…</p>
  </div>
</template>
