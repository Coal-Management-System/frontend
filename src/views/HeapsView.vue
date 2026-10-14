<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { batchesApi, heapsApi, warehousesApi } from '@/api/coal'
import type { BatchDto, HeapDto, MovementDto, WarehouseDto } from '@/api/types'
import { errMsg, fmt, fmtDate, heapStatusLabels, operationLabels } from '@/lib/format'
import Modal from '@/components/Modal.vue'

const rows = ref<HeapDto[]>([])
const warehouses = ref<WarehouseDto[]>([])
const batches = ref<BatchDto[]>([])
const error = ref('')
const saving = ref(false)

const showCreate = ref(false)
const splitTarget = ref<HeapDto | null>(null)
const mergeMode = ref(false)
const transferTarget = ref<HeapDto | null>(null)
const historyTarget = ref<HeapDto | null>(null)
const history = ref<MovementDto[]>([])

const createForm = reactive({
  heapNumber: '',
  volume: 0,
  warehouseId: '',
  originSource: '',
  batchIds: [] as string[]
})

const splitForm = reactive({
  volume: 0,
  toWarehouseId: '',
  newBatchNumber: '',
  sendImmediately: false
})

const mergeForm = reactive({ targetHeapId: '', sourceHeapIds: [] as string[] })
const transferForm = reactive({ toWarehouseId: '' })

async function load() {
  error.value = ''
  try {
    ;[rows.value, warehouses.value, batches.value] = await Promise.all([
      heapsApi.list(),
      warehousesApi.list(),
      batchesApi.list()
    ])
  } catch (e) {
    error.value = errMsg(e)
  }
}

function openSplit(h: HeapDto) {
  splitTarget.value = h
  splitForm.volume = 0
  splitForm.toWarehouseId = h.warehouseId || ''
  splitForm.newBatchNumber = ''
  splitForm.sendImmediately = false
}

function openTransfer(h: HeapDto) {
  transferTarget.value = h
  transferForm.toWarehouseId = h.warehouseId || ''
}

async function openHistory(h: HeapDto) {
  historyTarget.value = h
  history.value = await heapsApi.history(h.id)
}

async function submitCreate() {
  saving.value = true
  error.value = ''
  try {
    await heapsApi.create({
      heapNumber: createForm.heapNumber,
      volume: createForm.volume,
      warehouseId: createForm.warehouseId || null,
      originSource: createForm.originSource || undefined,
      batchIds: createForm.batchIds
    })
    showCreate.value = false
    createForm.heapNumber = ''
    createForm.volume = 0
    createForm.batchIds = []
    await load()
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    saving.value = false
  }
}

async function submitSplit() {
  if (!splitTarget.value) return
  saving.value = true
  error.value = ''
  try {
    await heapsApi.split(splitTarget.value.id, {
      volume: splitForm.volume,
      toWarehouseId: splitForm.toWarehouseId || null,
      newBatchNumber: splitForm.newBatchNumber,
      sendImmediately: splitForm.sendImmediately
    })
    splitTarget.value = null
    await load()
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    saving.value = false
  }
}

async function submitMerge() {
  saving.value = true
  error.value = ''
  try {
    await heapsApi.merge({
      targetHeapId: mergeForm.targetHeapId,
      sourceHeapIds: mergeForm.sourceHeapIds
    })
    mergeMode.value = false
    mergeForm.sourceHeapIds = []
    mergeForm.targetHeapId = ''
    await load()
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    saving.value = false
  }
}

async function submitTransfer() {
  if (!transferTarget.value) return
  saving.value = true
  error.value = ''
  try {
    await heapsApi.transfer(transferTarget.value.id, { toWarehouseId: transferForm.toWarehouseId })
    transferTarget.value = null
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
      <h1>Кучи угля</h1>
      <div>
        <button class="secondary" @click="mergeMode = true">Объединить</button>
        <button @click="showCreate = true">Новая куча +</button>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
    <div class="overflow-x-auto">
    <table>
      <thead>
        <tr>
          <th>Номер кучи</th>
          <th>Объем, т</th>
          <th>Место хранения</th>
          <th>Статус</th>
          <th>Дата</th>
          <th>Источник происхождения</th>
          <th>Партии</th>
          <th>Операция</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in rows" :key="h.id">
          <td>{{ h.heapNumber }}</td>
          <td>{{ fmt(h.volume) }}</td>
          <td>{{ h.warehouseNumber || '—' }}</td>
          <td>{{ heapStatusLabels[h.status] }}</td>
          <td>{{ fmtDate(h.createdAt) }}</td>
          <td>
            {{ h.originSource || '—' }}
            <button class="secondary" @click="openHistory(h)">история</button>
          </td>
          <td>{{ h.batchNumbers.join(', ') || '—' }}</td>
          <td>
            <button class="secondary" @click="openSplit(h)">Разделить</button>
            <button class="secondary" @click="openTransfer(h)">Трансфер</button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="8" class="muted">Куч пока нет</td>
        </tr>
      </tbody>
    </table>
    </div>
    </section>

    <Modal v-if="showCreate" title="Новая куча" @close="showCreate = false">
      <div class="form-grid">
        <label>
          Номер кучи
          <input v-model="createForm.heapNumber" />
        </label>
        <label>
          Объем, т
          <input v-model.number="createForm.volume" type="number" min="0" step="0.01" />
        </label>
        <label>
          Место хранения (склад)
          <select v-model="createForm.warehouseId">
            <option value="">Без склада</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.number }}</option>
          </select>
        </label>
        <label>
          Источник происхождения
          <input v-model="createForm.originSource" />
        </label>
        <label class="full">
          Партии в куче
          <select v-model="createForm.batchIds" multiple size="5">
            <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.batchNumber }}</option>
          </select>
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submitCreate">Добавить</button>
      </div>
    </Modal>

    <Modal
      v-if="splitTarget"
      :title="`Разделить кучу ${splitTarget.heapNumber}`"
      @close="splitTarget = null"
    >
      <div class="form-grid">
        <label>
          Объем отделения, т
          <input v-model.number="splitForm.volume" type="number" min="0" step="0.01" />
        </label>
        <label>
          Куда (склад)
          <select v-model="splitForm.toWarehouseId">
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.number }}</option>
          </select>
        </label>
        <label class="full">
          Номер новой партии
          <input v-model="splitForm.newBatchNumber" />
        </label>
        <label class="full">
          <input v-model="splitForm.sendImmediately" type="checkbox" />
          Разделить и отправить в переработку
        </label>
      </div>
      <p class="muted">При разделении кучи автоматически создается новая партия.</p>
      <div class="actions">
        <button class="secondary" @click="splitTarget = null">Отмена</button>
        <button :disabled="saving" @click="submitSplit">Разделить</button>
      </div>
    </Modal>

    <Modal v-if="mergeMode" title="Объединить кучи" @close="mergeMode = false">
      <div class="form-grid">
        <label class="full">
          Целевая куча
          <select v-model="mergeForm.targetHeapId">
            <option value="" disabled>Выберите кучу</option>
            <option v-for="h in rows" :key="h.id" :value="h.id">{{ h.heapNumber }}</option>
          </select>
        </label>
        <label class="full">
          Кучи-источники
          <select v-model="mergeForm.sourceHeapIds" multiple size="6">
            <option v-for="h in rows" :key="h.id" :value="h.id">{{ h.heapNumber }}</option>
          </select>
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="mergeMode = false">Отмена</button>
        <button :disabled="saving" @click="submitMerge">Объединить</button>
      </div>
    </Modal>

    <Modal
      v-if="transferTarget"
      :title="`Трансфер кучи ${transferTarget.heapNumber}`"
      @close="transferTarget = null"
    >
      <div class="form-grid">
        <label class="full">
          Куда (склад)
          <select v-model="transferForm.toWarehouseId">
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.number }}</option>
          </select>
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="transferTarget = null">Отмена</button>
        <button :disabled="saving" @click="submitTransfer">Трансфер</button>
      </div>
    </Modal>

    <Modal
      v-if="historyTarget"
      :title="`История кучи ${historyTarget.heapNumber}`"
      @close="historyTarget = null"
    >
      <div class="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Операция</th>
            <th>Объем, т</th>
            <th>Откуда</th>
            <th>Куда</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in history" :key="m.id">
            <td>{{ operationLabels[m.operation] }}</td>
            <td>{{ fmt(m.volume) }}</td>
            <td>{{ m.fromLocation || '—' }}</td>
            <td>{{ m.toLocation || '—' }}</td>
            <td>{{ fmtDate(m.createdAt) }}</td>
          </tr>
          <tr v-if="!history.length">
            <td colspan="5" class="muted">Движений пока нет</td>
          </tr>
        </tbody>
      </table>
      </div>
      <div class="actions">
        <button class="secondary" @click="historyTarget = null">Закрыть</button>
      </div>
    </Modal>
  </div>
</template>
