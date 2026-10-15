<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { batchesApi, pilesApi, qrImageUrl } from '@/api/coal'
import type { BatchDto, PileDto } from '@/api/types'
import { batchStatusLabels, errMsg, fmt, fmtDate, pileStatusLabels } from '@/lib/format'

const route = useRoute()
const type = route.params.type as 'batch' | 'pile' | 'movement'
const id = route.params.id as string

const batch = ref<BatchDto | null>(null)
const pile = ref<PileDto | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    if (type === 'batch') batch.value = await batchesApi.get(id)
    else if (type === 'pile') pile.value = await pilesApi.get(id)
  } catch (e) {
    error.value = errMsg(e)
  }
})
</script>

<template>
  <div>
    <h1>QR-код</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else>
      <div class="qr-box">
        <img :src="qrImageUrl(type, id)" alt="QR-код" width="320" height="320" />
      </div>
      <dl v-if="batch" class="kv" style="margin-top: 1rem">
        <dt>Партия</dt>
        <dd>{{ batch.batchNumber }}</dd>
        <dt>Статус</dt>
        <dd>{{ batchStatusLabels[batch.status] }}</dd>
        <dt>Текущий остаток, т</dt>
        <dd>{{ fmt(batch.currentRemainder) }}</dd>
        <dt>Место хранения</dt>
        <dd>{{ batch.storageLocations.join(', ') || '—' }}</dd>
        <dt>Создана</dt>
        <dd>{{ fmtDate(batch.createdAt) }}</dd>
      </dl>
      <dl v-else-if="pile" class="kv" style="margin-top: 1rem">
        <dt>Штабель</dt>
        <dd>{{ pile.pileNumber }}</dd>
        <dt>Статус</dt>
        <dd>{{ pileStatusLabels[pile.status] }}</dd>
        <dt>Объем, т</dt>
        <dd>{{ fmt(pile.volume) }}</dd>
        <dt>Склад</dt>
        <dd>{{ pile.warehouseNumber || '—' }}</dd>
        <dt>Партии</dt>
        <dd>{{ pile.batchNumbers.join(', ') || '—' }}</dd>
      </dl>
      <p v-else class="muted">Движение {{ id }}</p>
    </template>
  </div>
</template>
