<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { batchesApi, labsApi, qrImageUrl } from '@/api/coal'
import type { AnalysisDto, BatchDto, QualityHistoryRow } from '@/api/types'
import { batchStatusLabels, errMsg, fmt, fmtDate, indicatorLabels, originLabels, stageLabels } from '@/lib/format'

const route = useRoute()
const id = route.params.id as string

const batch = ref<BatchDto | null>(null)
const history = ref<QualityHistoryRow[]>([])
const analyses = ref<AnalysisDto[]>([])
const error = ref('')
const tab = ref<'general' | 'origin' | 'quantity' | 'quality' | 'qr'>('general')

onMounted(async () => {
  try {
    batch.value = await batchesApi.get(id)
    history.value = await batchesApi.qualityHistory(id)
    analyses.value = await labsApi.analyses(id)
  } catch (e) {
    error.value = errMsg(e)
  }
})

function valueOf(a: AnalysisDto, key: string): string {
  const v = a.values.find(x => x.indicator === key)
  return v ? `${v.value}${v.unit ? ' ' + v.unit : ''}` : '—'
}
</script>

<template>
  <div>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else-if="batch">
      <div class="toolbar">
        <h1>Паспорт партии № {{ batch.batchNumber }}</h1>
        <RouterLink to="/batches" class="btn secondary">К списку</RouterLink>
      </div>

      <div class="tabs">
        <button :class="{ active: tab === 'general' }" @click="tab = 'general'">
          Общая информация
        </button>
        <button :class="{ active: tab === 'origin' }" @click="tab = 'origin'">Происхождение</button>
        <button :class="{ active: tab === 'quantity' }" @click="tab = 'quantity'">
          Количественные показатели
        </button>
        <button :class="{ active: tab === 'quality' }" @click="tab = 'quality'">
          Показатели качества
        </button>
        <button :class="{ active: tab === 'qr' }" @click="tab = 'qr'">QR Code</button>
      </div>

      <dl v-if="tab === 'general'" class="kv">
        <dt>Номер партии</dt>
        <dd>{{ batch.batchNumber }}</dd>
        <dt>Тип продукции</dt>
        <dd>{{ batch.productType || '—' }}</dd>
        <dt>Текущий статус</dt>
        <dd>{{ batchStatusLabels[batch.status] }}</dd>
        <dt>Дата создания</dt>
        <dd>{{ fmtDate(batch.createdAt) }}</dd>
        <dt>Марка угля</dt>
        <dd>{{ batch.coalGrade || '—' }}</dd>
        <dt>Фракция</dt>
        <dd>{{ batch.fraction || '—' }}</dd>
      </dl>

      <dl v-else-if="tab === 'origin'" class="kv">
        <dt>Источник образования партии</dt>
        <dd>{{ originLabels[batch.originType] }}</dd>
        <dt>Месторождение</dt>
        <dd>{{ batch.deposit || '—' }}</dd>
        <dt>Участок добычи</dt>
        <dd>{{ batch.miningSite || '—' }}</dd>
        <dt>Карьер</dt>
        <dd>{{ batch.quarry || '—' }}</dd>
        <dt>Смена / производственный период</dt>
        <dd>{{ batch.shiftPeriod || '—' }}</dd>
        <dt>Поставщик</dt>
        <dd>{{ batch.supplier || '—' }}</dd>
        <dt>Партии-источники</dt>
        <dd>{{ batch.sourceBatchNumbers.join(', ') || '—' }}</dd>
        <dt>Кучи</dt>
        <dd>{{ batch.heapNumbers.join(', ') || '—' }}</dd>
      </dl>

      <dl v-else-if="tab === 'quantity'" class="kv">
        <dt>Первоначальный вес, т</dt>
        <dd>{{ fmt(batch.initialWeight) }}</dd>
        <dt>Текущий остаток, т</dt>
        <dd>{{ fmt(batch.currentRemainder) }}</dd>
        <dt>Зарезервированный объем, т</dt>
        <dd>{{ fmt(batch.reservedVolume) }}</dd>
        <dt>Свободный объем, т</dt>
        <dd>{{ fmt(batch.freeVolume) }}</dd>
        <dt>Объем в переработке, т</dt>
        <dd>{{ fmt(batch.inProcessingVolume) }}</dd>
        <dt>Объем отгруженной продукции, т</dt>
        <dd>{{ fmt(batch.shippedVolume) }}</dd>
        <dt>Потери, т</dt>
        <dd>{{ fmt(batch.losses) }}</dd>
      </dl>

      <div v-else-if="tab === 'quality'">
        <section class="panel">
          <h2>История качества</h2>
        <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Зольность</th>
              <th>Влажность</th>
              <th>Калорийность</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in history" :key="i">
              <td>{{ fmtDate(h.analysisDate) }}</td>
              <td>{{ h.ash === null ? '—' : h.ash + '%' }}</td>
              <td>{{ h.moisture === null ? '—' : h.moisture + '%' }}</td>
              <td>{{ fmt(h.calorific) }}</td>
              <td>{{ stageLabels[h.stage] }}</td>
            </tr>
            <tr v-if="!history.length">
              <td colspan="5" class="muted">Анализов пока нет</td>
            </tr>
          </tbody>
        </table>
        </div>
        </section>

        <section class="panel">
          <h2>Результаты анализов</h2>
        <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Номер пробы</th>
              <th>Лаборатория</th>
              <th>Показатели</th>
              <th>№ протокола</th>
              <th>Ответственный</th>
              <th>Метод</th>
              <th>Этап</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in analyses" :key="a.id">
              <td>{{ a.sampleNumber }}</td>
              <td>{{ a.labName }}</td>
              <td>
                <div v-for="v in a.values" :key="v.indicator">
                  {{ indicatorLabels[v.indicator] }}: {{ v.value }}{{ v.unit ? ' ' + v.unit : '' }}
                </div>
              </td>
              <td>{{ a.protocolNumber || '—' }}</td>
              <td>{{ a.responsibleEmployee || '—' }}</td>
              <td>{{ a.method || '—' }}</td>
              <td>{{ stageLabels[a.stage] }}</td>
            </tr>
            <tr v-if="!analyses.length">
              <td colspan="7" class="muted">Анализов пока нет</td>
            </tr>
          </tbody>
        </table>
        </div>
        </section>
        <p class="muted">Добавить результат анализа можно в разделе «Лаборатории».</p>
      </div>

      <div v-else class="qr-box">
        <img :src="qrImageUrl('batch', batch.id)" alt="QR-код партии" width="320" height="320" />
        <p class="muted">QR-код партии {{ batch.batchNumber }}</p>
      </div>
    </template>
    <p v-else class="muted">Загрузка…</p>
  </div>
</template>
