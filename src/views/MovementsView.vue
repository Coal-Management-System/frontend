<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { batchesApi, heapsApi, movementsApi, qrImageUrl } from '@/api/coal'
import type { BatchDto, HeapDto, MovementCreateRequest, MovementDto } from '@/api/types'
import { errMsg, fmt, fmtDate, operationLabels } from '@/lib/format'
import Modal from '@/components/Modal.vue'

const rows = ref<MovementDto[]>([])
const batches = ref<BatchDto[]>([])
const heaps = ref<HeapDto[]>([])
const error = ref('')
const showCreate = ref(false)
const saving = ref(false)

const form = reactive<MovementCreateRequest & { batchId: string; heapId: string }>({
  batchId: '',
  heapId: '',
  operation: 'PILE_TRANSFERRED',
  volume: 0,
  fromLocation: '',
  toLocation: '',
  originSource: ''
})

async function load() {
  error.value = ''
  try {
    ;[rows.value, batches.value, heaps.value] = await Promise.all([
      movementsApi.list(),
      batchesApi.list(),
      heapsApi.list()
    ])
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    await movementsApi.create({
      batchId: form.batchId || null,
      heapId: form.heapId || null,
      operation: form.operation,
      volume: form.volume,
      fromLocation: form.fromLocation || undefined,
      toLocation: form.toLocation || undefined,
      originSource: form.originSource || undefined
    })
    showCreate.value = false
    await load()
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="toolbar">
      <h1>Движение продукции</h1>
      <button @click="showCreate = true">Создать движение +</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
    <div class="overflow-x-auto">
    <table>
      <thead>
        <tr>
          <th>Уникальный номер партии</th>
          <th>Куча</th>
          <th>Операция</th>
          <th>Объем, т</th>
          <th>Откуда</th>
          <th>Куда</th>
          <th>Дата</th>
          <th>QR-Code</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in rows" :key="m.id">
          <td>{{ m.batchNumber || '—' }}</td>
          <td>{{ m.heapNumber || '—' }}</td>
          <td>{{ operationLabels[m.operation] }}</td>
          <td>{{ fmt(m.volume) }}</td>
          <td>{{ m.fromLocation || '—' }}</td>
          <td>{{ m.toLocation || '—' }}</td>
          <td>{{ fmtDate(m.createdAt) }}</td>
          <td>
            <RouterLink :to="`/qr/movement/${m.id}`" class="btn secondary">Показать</RouterLink>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="8" class="muted">Движений пока нет</td>
        </tr>
      </tbody>
    </table>
    </div>
    </section>

    <Modal v-if="showCreate" title="Новое движение" @close="showCreate = false">
      <div class="form-grid">
        <label>
          Партия
          <select v-model="form.batchId">
            <option value="">Не указана</option>
            <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.batchNumber }}</option>
          </select>
        </label>
        <label>
          Куча
          <select v-model="form.heapId">
            <option value="">Не указана</option>
            <option v-for="h in heaps" :key="h.id" :value="h.id">{{ h.heapNumber }}</option>
          </select>
        </label>
        <label>
          Операция
          <select v-model="form.operation">
            <option value="PILE_CREATED">Создание кучи</option>
            <option value="PILE_MERGED">Слияние куч</option>
            <option value="PILE_SPLIT">Разделение кучи</option>
            <option value="PILE_TRANSFERRED">Трансфер</option>
          </select>
        </label>
        <label>
          Объем, т
          <input v-model.number="form.volume" type="number" min="0" step="0.01" />
        </label>
        <label>
          Откуда
          <input v-model="form.fromLocation" />
        </label>
        <label>
          Куда
          <input v-model="form.toLocation" />
        </label>
        <label class="full">
          Источник происхождения
          <input v-model="form.originSource" />
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submit">Добавить</button>
      </div>
    </Modal>
  </div>
</template>
