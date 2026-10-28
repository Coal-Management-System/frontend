<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { qrApi } from '@/api/coal'
import type { QrPassportDto } from '@/api/types'
import {
  batchStatusLabels,
  errMsg,
  fmt,
  fmtDate,
  indicatorLabels,
  operationLabels,
  originLabels,
  pileStatusLabels,
  stageLabels
} from '@/lib/format'

const route = useRoute()

const type = route.params.type as 'batch' | 'pile' | 'movement'
const id = route.params.id as string

const passport = ref<QrPassportDto | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    passport.value = await qrApi.passport(type, id)
  } catch (e) {
    error.value = errMsg(e)
  }
})

function measurement(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return unit ? `${fmt(value)} ${unit}` : fmt(value)
}

/** Mirrors the APK statusColor(): NEW cyan, IN_PROCESSING amber, READY green, SHIPPED/ARCHIVED mute. */
function statusClass(status: string | null | undefined): string {
  switch (status) {
    case 'NEW':
      return 'qr-apk__value--cyan'
    case 'IN_PROCESSING':
      return 'qr-apk__value--amber'
    case 'READY_FOR_SHIPMENT':
      return 'qr-apk__value--green'
    case 'SHIPPED':
    case 'ARCHIVED':
      return 'qr-apk__value--mute'
    default:
      return ''
  }
}
</script>

<template>
  <div class="qr-apk">
    <header class="qr-apk__bar">
      <span class="qr-apk__bar-action">Только просмотр</span>
      <span class="qr-apk__bar-title">Паспорт партии</span>
    </header>

    <p v-if="error" class="qr-apk__error">{{ error }}</p>

    <template v-else-if="passport">
      <!-- Batch passport: same sections / cards / rows the APK renders -->
      <template v-if="passport.batch">
        <p class="qr-apk__section">Общая информация</p>
        <section class="qr-apk__card">
          <h2 class="qr-apk__card-title">{{ passport.batch.batchNumber }}</h2>
          <div class="qr-apk__row">
            <span>Номер партии</span><b>{{ passport.batch.batchNumber }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Тип продукции</span><b>{{ passport.batch.productType || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Текущий статус</span>
            <b :class="statusClass(passport.batch.status)">
              {{ batchStatusLabels[passport.batch.status] }}
            </b>
          </div>
          <div class="qr-apk__row">
            <span>Марка угля</span><b>{{ passport.batch.coalGrade || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Фракция</span><b>{{ passport.batch.fraction || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Дата создания</span><b>{{ fmtDate(passport.batch.createdAt) }}</b>
          </div>
        </section>

        <p class="qr-apk__section">Происхождение</p>
        <section class="qr-apk__card">
          <h2 class="qr-apk__card-title">Происхождение</h2>
          <div class="qr-apk__row">
            <span>Источник образования партии</span>
            <b>{{ originLabels[passport.batch.originType] }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Месторождение</span><b>{{ passport.batch.deposit || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Участок добычи</span><b>{{ passport.batch.miningSite || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Карьер</span><b>{{ passport.batch.quarry || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Смена / производственный период</span>
            <b>{{ passport.batch.shiftPeriod || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Поставщик</span><b>{{ passport.batch.supplier || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Дата добычи или поступления</span>
            <b>{{ fmtDate(passport.batch.minedAt) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Партии-источники</span>
            <b>{{ passport.batch.sourceBatchNumbers.join(', ') || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Штабели</span>
            <b>{{ passport.batch.pileNumbers.join(', ') || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Места хранения</span>
            <b>{{ passport.batch.storageLocations.join(', ') || '—' }}</b>
          </div>
        </section>

        <p class="qr-apk__section">Количественные показатели</p>
        <section class="qr-apk__card">
          <h2 class="qr-apk__card-title">Количественные показатели</h2>
          <div class="qr-apk__row">
            <span>Первоначальный вес, т</span><b>{{ fmt(passport.batch.initialWeight) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Текущий остаток, т</span><b>{{ fmt(passport.batch.currentRemainder) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Зарезервированный объем, т</span><b>{{ fmt(passport.batch.reservedVolume) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Свободный объем, т</span><b>{{ fmt(passport.batch.freeVolume) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Объем в переработке, т</span><b>{{ fmt(passport.batch.inProcessingVolume) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Объем отгруженной продукции, т</span><b>{{ fmt(passport.batch.shippedVolume) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Потери, т</span><b>{{ fmt(passport.batch.losses) }}</b>
          </div>
        </section>

        <p class="qr-apk__section">История качества</p>
        <template v-if="passport.quality.length">
          <section v-for="(q, i) in passport.quality" :key="i" class="qr-apk__card">
            <h2 class="qr-apk__card-title">
              {{ fmtDate(q.analysisDate) }} · {{ stageLabels[q.stage] }}
            </h2>
            <div class="qr-apk__row">
              <span>Зольность</span><b>{{ q.ash === null ? '—' : fmt(q.ash) + ' %' }}</b>
            </div>
            <div class="qr-apk__row">
              <span>Влажность</span><b>{{ q.moisture === null ? '—' : fmt(q.moisture) + ' %' }}</b>
            </div>
            <div class="qr-apk__row">
              <span>Калорийность</span><b>{{ q.calorific === null ? '—' : fmt(q.calorific) }}</b>
            </div>
          </section>
        </template>
        <p v-else class="qr-apk__muted">Замеров качества пока нет</p>

        <p class="qr-apk__section">Результаты анализов</p>
        <template v-if="passport.analyses.length">
          <section v-for="a in passport.analyses" :key="a.id" class="qr-apk__card">
            <h2 class="qr-apk__card-title">{{ a.sampleNumber }} · {{ a.labName }}</h2>
            <div v-for="v in a.values" :key="v.indicator" class="qr-apk__row">
              <span>{{ indicatorLabels[v.indicator] }}</span>
              <b>{{ measurement(v.value, v.unit) }}</b>
            </div>
            <div class="qr-apk__row">
              <span>№ протокола</span><b>{{ a.protocolNumber || '—' }}</b>
            </div>
            <div class="qr-apk__row">
              <span>Ответственный</span><b>{{ a.responsibleEmployee || '—' }}</b>
            </div>
            <div class="qr-apk__row">
              <span>Метод</span><b>{{ a.method || '—' }}</b>
            </div>
            <div class="qr-apk__row">
              <span>Этап</span><b>{{ stageLabels[a.stage] }}</b>
            </div>
          </section>
        </template>
        <p v-else class="qr-apk__muted">Анализов пока нет</p>
      </template>

      <!-- Pile passport -->
      <template v-else-if="passport.pile">
        <p class="qr-apk__section">Штабель</p>
        <section class="qr-apk__card">
          <h2 class="qr-apk__card-title">{{ passport.pile.pileNumber }}</h2>
          <div class="qr-apk__row">
            <span>Статус</span><b>{{ pileStatusLabels[passport.pile.status] }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Объем, т</span><b>{{ fmt(passport.pile.volume) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Склад</span><b>{{ passport.pile.warehouseNumber || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Партии</span>
            <b>{{ passport.pile.batchNumbers.join(', ') || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Источник происхождения</span>
            <b>{{ passport.pile.originSource || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Дата</span><b>{{ fmtDate(passport.pile.createdAt) }}</b>
          </div>
        </section>
      </template>

      <!-- Movement passport -->
      <template v-else-if="passport.movement">
        <p class="qr-apk__section">Движение продукции</p>
        <section class="qr-apk__card">
          <h2 class="qr-apk__card-title">
            {{ operationLabels[passport.movement.operation] }}
          </h2>
          <div class="qr-apk__row">
            <span>Операция</span>
            <b>{{ operationLabels[passport.movement.operation] }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Объем, т</span><b>{{ fmt(passport.movement.volume) }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Партия</span><b>{{ passport.movement.batchNumber || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Штабель</span><b>{{ passport.movement.pileNumber || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Откуда</span><b>{{ passport.movement.fromLocation || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Куда</span><b>{{ passport.movement.toLocation || '—' }}</b>
          </div>
          <div class="qr-apk__row">
            <span>Дата</span><b>{{ fmtDate(passport.movement.createdAt) }}</b>
          </div>
        </section>
      </template>
    </template>

    <p v-else class="qr-apk__loading">Загрузка…</p>
  </div>
</template>

<style scoped>
/* Mirrors the Android APK passport screen (row_section / row_card / row_kv).
   Dark theme uses the APK palette verbatim; light theme swaps readable equivalents. */
.qr-apk {
  --apk-night: #050914;
  --apk-panel: #0a1226;
  --apk-edge: #1b2947;
  --apk-ink: #e8eefb;
  --apk-mute: #8b9bc0;
  --apk-cyan: #22d3ee;
  --apk-amber: #fbbf24;
  --apk-green: #34d399;
  --apk-red: #fb7185;

  min-height: 100vh;
  background: var(--apk-night);
  padding: 0 16px 20px;
}

:global(html[data-theme='light']) .qr-apk {
  --apk-night: #f4f6fb;
  --apk-panel: #ffffff;
  --apk-edge: rgba(16, 24, 40, 0.12);
  --apk-ink: #101828;
  --apk-mute: #5b6b8c;
  --apk-cyan: #0891b2;
  --apk-amber: #b45309;
  --apk-green: #047857;
  --apk-red: #be123c;
}

.qr-apk__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 8px;
}

.qr-apk__bar-action {
  color: var(--apk-cyan);
  font-size: 13px;
  font-weight: 600;
}

.qr-apk__bar-title {
  color: var(--apk-mute);
  font-size: 13px;
}

.qr-apk__section {
  margin: 0;
  padding: 20px 4px 8px;
  color: var(--apk-cyan);
  font-size: 12px;
  font-weight: 700;
}

.qr-apk__card {
  margin-bottom: 10px;
  padding: 4px 14px 10px;
  border: 1px solid var(--apk-edge);
  border-radius: 14px;
  background: var(--apk-panel);
}

.qr-apk__card-title {
  margin: 0;
  padding: 10px 0 2px;
  color: var(--apk-ink);
  font-size: 14px;
  font-weight: 700;
}

.qr-apk__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 7px 0;
}

.qr-apk__row span {
  flex: 1 1 50%;
  color: var(--apk-mute);
  font-size: 13px;
}

.qr-apk__row b {
  flex: 1 1 50%;
  color: var(--apk-ink);
  font-size: 14px;
  font-weight: 500;
  text-align: right;
  overflow-wrap: anywhere;
}

.qr-apk__value--cyan {
  color: var(--apk-cyan) !important;
}

.qr-apk__value--amber {
  color: var(--apk-amber) !important;
}

.qr-apk__value--green {
  color: var(--apk-green) !important;
}

.qr-apk__value--mute {
  color: var(--apk-mute) !important;
}

.qr-apk__muted,
.qr-apk__loading {
  padding: 12px;
  color: var(--apk-mute);
  font-size: 13px;
}

.qr-apk__loading {
  padding-top: 40px;
  text-align: center;
  font-size: 14px;
}

.qr-apk__error {
  padding: 0 20px;
  color: var(--apk-red);
  font-size: 14px;
}
</style>
