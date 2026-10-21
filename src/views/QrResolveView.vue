<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { qrApi, qrImageUrl } from '@/api/coal'
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
</script>

<template>
  <div class="qr-public">
    <header class="qr-public__head">
      <h1>Паспорт объекта</h1>
      <p class="muted">Открыто по QR-коду · только просмотр</p>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-else-if="passport">
      <!-- Batch passport: same sections the phone app renders -->
      <template v-if="passport.batch">
        <section class="panel qr-public__section">
          <h2>Общие сведения</h2>
          <dl class="kv">
            <dt>Номер партии</dt>
            <dd>{{ passport.batch.batchNumber }}</dd>
            <dt>Тип продукции</dt>
            <dd>{{ passport.batch.productType || '—' }}</dd>
            <dt>Текущий статус</dt>
            <dd>{{ batchStatusLabels[passport.batch.status] }}</dd>
            <dt>Марка угля</dt>
            <dd>{{ passport.batch.coalGrade || '—' }}</dd>
            <dt>Фракция</dt>
            <dd>{{ passport.batch.fraction || '—' }}</dd>
            <dt>Дата создания</dt>
            <dd>{{ fmtDate(passport.batch.createdAt) }}</dd>
          </dl>
        </section>

        <section class="panel qr-public__section">
          <h2>Происхождение</h2>
          <dl class="kv">
            <dt>Источник образования партии</dt>
            <dd>{{ originLabels[passport.batch.originType] }}</dd>
            <dt>Месторождение</dt>
            <dd>{{ passport.batch.deposit || '—' }}</dd>
            <dt>Участок добычи</dt>
            <dd>{{ passport.batch.miningSite || '—' }}</dd>
            <dt>Карьер</dt>
            <dd>{{ passport.batch.quarry || '—' }}</dd>
            <dt>Смена / производственный период</dt>
            <dd>{{ passport.batch.shiftPeriod || '—' }}</dd>
            <dt>Поставщик</dt>
            <dd>{{ passport.batch.supplier || '—' }}</dd>
            <dt>Дата добычи или поступления</dt>
            <dd>{{ fmtDate(passport.batch.minedAt) }}</dd>
            <dt>Партии-источники</dt>
            <dd>{{ passport.batch.sourceBatchNumbers.join(', ') || '—' }}</dd>
            <dt>Штабели</dt>
            <dd>{{ passport.batch.pileNumbers.join(', ') || '—' }}</dd>
            <dt>Места хранения</dt>
            <dd>{{ passport.batch.storageLocations.join(', ') || '—' }}</dd>
          </dl>
        </section>

        <section class="panel qr-public__section">
          <h2>Количество, т</h2>
          <dl class="kv">
            <dt>Первоначальный вес</dt>
            <dd>{{ fmt(passport.batch.initialWeight) }}</dd>
            <dt>Текущий остаток</dt>
            <dd>{{ fmt(passport.batch.currentRemainder) }}</dd>
            <dt>Зарезервированный объем</dt>
            <dd>{{ fmt(passport.batch.reservedVolume) }}</dd>
            <dt>Свободный объем</dt>
            <dd>{{ fmt(passport.batch.freeVolume) }}</dd>
            <dt>Объем в переработке</dt>
            <dd>{{ fmt(passport.batch.inProcessingVolume) }}</dd>
            <dt>Объем отгруженной продукции</dt>
            <dd>{{ fmt(passport.batch.shippedVolume) }}</dd>
            <dt>Потери</dt>
            <dd>{{ fmt(passport.batch.losses) }}</dd>
          </dl>
        </section>

        <section class="panel qr-public__section">
          <h2>История качества</h2>
          <div v-if="passport.quality.length" class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Этап</th>
                  <th>Зольность, %</th>
                  <th>Влажность, %</th>
                  <th>Калорийность</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(q, i) in passport.quality" :key="i">
                  <td>{{ fmtDate(q.analysisDate) }}</td>
                  <td>{{ stageLabels[q.stage] }}</td>
                  <td>{{ q.ash === null ? '—' : fmt(q.ash) }}</td>
                  <td>{{ q.moisture === null ? '—' : fmt(q.moisture) }}</td>
                  <td>{{ q.calorific === null ? '—' : fmt(q.calorific) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="muted">Замеров качества пока нет</p>
        </section>

        <section class="panel qr-public__section">
          <h2>Протоколы лабораторий</h2>
          <template v-if="passport.analyses.length">
            <div v-for="a in passport.analyses" :key="a.id" class="qr-public__card">
              <p class="qr-public__card-title">
                {{ a.sampleNumber }} · {{ a.labName }}
              </p>
              <dl class="kv">
                <template v-for="v in a.values" :key="v.indicator">
                  <dt>{{ indicatorLabels[v.indicator] }}</dt>
                  <dd>{{ measurement(v.value, v.unit) }}</dd>
                </template>
                <dt>№ протокола</dt>
                <dd>{{ a.protocolNumber || '—' }}</dd>
                <dt>Ответственный</dt>
                <dd>{{ a.responsibleEmployee || '—' }}</dd>
                <dt>Метод</dt>
                <dd>{{ a.method || '—' }}</dd>
                <dt>Этап</dt>
                <dd>{{ stageLabels[a.stage] }}</dd>
              </dl>
            </div>
          </template>
          <p v-else class="muted">Протоколов пока нет</p>
        </section>
      </template>

      <!-- Pile passport -->
      <section v-else-if="passport.pile" class="panel qr-public__section">
        <h2>Штабель</h2>
        <dl class="kv">
          <dt>Номер штабеля</dt>
          <dd>{{ passport.pile.pileNumber }}</dd>
          <dt>Статус</dt>
          <dd>{{ pileStatusLabels[passport.pile.status] }}</dd>
          <dt>Объем, т</dt>
          <dd>{{ fmt(passport.pile.volume) }}</dd>
          <dt>Склад</dt>
          <dd>{{ passport.pile.warehouseNumber || '—' }}</dd>
          <dt>Партии</dt>
          <dd>{{ passport.pile.batchNumbers.join(', ') || '—' }}</dd>
          <dt>Источник происхождения</dt>
          <dd>{{ passport.pile.originSource || '—' }}</dd>
          <dt>Дата</dt>
          <dd>{{ fmtDate(passport.pile.createdAt) }}</dd>
        </dl>
      </section>

      <!-- Movement passport -->
      <section v-else-if="passport.movement" class="panel qr-public__section">
        <h2>Движение продукции</h2>
        <dl class="kv">
          <dt>Операция</dt>
          <dd>{{ operationLabels[passport.movement.operation] }}</dd>
          <dt>Объем, т</dt>
          <dd>{{ fmt(passport.movement.volume) }}</dd>
          <dt>Партия</dt>
          <dd>{{ passport.movement.batchNumber || '—' }}</dd>
          <dt>Штабель</dt>
          <dd>{{ passport.movement.pileNumber || '—' }}</dd>
          <dt>Откуда</dt>
          <dd>{{ passport.movement.fromLocation || '—' }}</dd>
          <dt>Куда</dt>
          <dd>{{ passport.movement.toLocation || '—' }}</dd>
          <dt>Дата</dt>
          <dd>{{ fmtDate(passport.movement.createdAt) }}</dd>
        </dl>
      </section>

      <p class="qr-public__img">
        <img :src="qrImageUrl(type, id)" alt="QR-код" width="180" height="180" />
      </p>
    </template>

    <p v-else class="muted">Загрузка…</p>
  </div>
</template>

<style scoped>
.qr-public {
  max-width: 760px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.qr-public__head {
  margin-bottom: 1rem;
}

.qr-public__head h1 {
  margin: 0;
}

.qr-public__section {
  margin-bottom: 1rem;
}

.qr-public__section h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.qr-public__card {
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.qr-public__card-title {
  margin: 0 0 0.5rem;
  font-weight: 700;
}

.qr-public__img {
  text-align: center;
}
</style>
