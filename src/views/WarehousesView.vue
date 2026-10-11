<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { heapsApi, warehousesApi } from '@/api/coal'
import type { HeapDto, WarehouseCreateRequest, WarehouseDto } from '@/api/types'
import { errMsg, fmt, fmtDate, heapStatusLabels, warehouseStatusLabels } from '@/lib/format'
import Modal from '@/components/Modal.vue'

const rows = ref<WarehouseDto[]>([])
const heapsByWarehouse = ref<Record<string, HeapDto[]>>({})
const open = ref<Record<string, boolean>>({})
const error = ref('')
const showCreate = ref(false)
const saving = ref(false)

const form = reactive<WarehouseCreateRequest>({ number: '', location: '', status: 'ACTIVE' })

async function load() {
  error.value = ''
  try {
    rows.value = await warehousesApi.list()
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function toggleHeaps(w: WarehouseDto) {
  open.value[w.id] = !open.value[w.id]
  if (open.value[w.id] && !heapsByWarehouse.value[w.id]) {
    heapsByWarehouse.value[w.id] = await warehousesApi.heaps(w.id)
  }
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    await warehousesApi.create({ ...form })
    showCreate.value = false
    form.number = ''
    form.location = ''
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
      <h1>Склады</h1>
      <button @click="showCreate = true">Новый склад</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
    <table>
      <thead>
        <tr>
          <th>Номер склада</th>
          <th>Место положения</th>
          <th>Статус</th>
          <th>Дата</th>
          <th>Кучи</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="w in rows" :key="w.id">
          <tr>
            <td>{{ w.number }}</td>
            <td>{{ w.location || '—' }}</td>
            <td>{{ warehouseStatusLabels[w.status] }}</td>
            <td>{{ fmtDate(w.createdAt) }}</td>
            <td>
              <button class="secondary" @click="toggleHeaps(w)">
                {{ open[w.id] ? 'Скрыть кучи' : 'Показать кучи' }} ({{ w.heapCount }})
              </button>
            </td>
          </tr>
          <tr v-if="open[w.id]">
            <td colspan="5">
              <table v-if="heapsByWarehouse[w.id]?.length">
                <thead>
                  <tr>
                    <th>Номер кучи</th>
                    <th>Объем, т</th>
                    <th>Статус</th>
                    <th>Партии</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in heapsByWarehouse[w.id]" :key="h.id">
                    <td>{{ h.heapNumber }}</td>
                    <td>{{ fmt(h.volume) }}</td>
                    <td>{{ heapStatusLabels[h.status] }}</td>
                    <td>{{ h.batchNumbers.join(', ') || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <span v-else class="muted">Куч на складе нет</span>
            </td>
          </tr>
        </template>
        <tr v-if="!rows.length">
          <td colspan="5" class="muted">Складов пока нет</td>
        </tr>
      </tbody>
    </table>
    </section>

    <Modal v-if="showCreate" title="Новый склад" @close="showCreate = false">
      <div class="form-grid">
        <label>
          Номер
          <input v-model="form.number" />
        </label>
        <label>
          Место положения
          <input v-model="form.location" />
        </label>
        <label>
          Статус
          <select v-model="form.status">
            <option value="ACTIVE">Активен</option>
            <option value="CLOSED">Закрыт</option>
          </select>
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submit">Добавить</button>
      </div>
    </Modal>
  </div>
</template>
