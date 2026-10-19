<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { warehousesApi } from '@/api/coal'
import type { PileDto, WarehouseCreateRequest, WarehouseDto } from '@/api/types'
import { errMsg, fmt, fmtDate, pileStatusLabels, warehouseStatusLabels } from '@/lib/format'
import Modal from '@/components/Modal.vue'
import Pagination from '@/components/Pagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const {
  rows,
  loading,
  error,
  page,
  size,
  totalElements,
  totalPages,
  load,
  prev,
  next,
  setSize
} = usePagedList<WarehouseDto>(warehousesApi.list)

const pilesByWarehouse = ref<Record<string, PileDto[]>>({})
const open = ref<Record<string, boolean>>({})
const showCreate = ref(false)
const saving = ref(false)
const WAREHOUSE_PREFIX = 'Ск-'

const form = reactive<WarehouseCreateRequest>({ number: '', location: '', status: 'ACTIVE' })

watch(page, () => {
  open.value = {}
  pilesByWarehouse.value = {}
})

async function togglePiles(w: WarehouseDto) {
  open.value[w.id] = !open.value[w.id]
  if (open.value[w.id] && !pilesByWarehouse.value[w.id]) {
    pilesByWarehouse.value[w.id] = await warehousesApi.piles(w.id)
  }
}

async function submit() {
  error.value = ''
  const number = form.number.trim()
  if (!number) {
    error.value = 'Укажите номер склада'
    return
  }
  saving.value = true
  try {
    await warehousesApi.create({ ...form, number: `${WAREHOUSE_PREFIX}${number}` })
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
    <div class="overflow-x-auto">
    <table>
      <thead>
        <tr>
          <th>Номер склада</th>
          <th>Место положения</th>
          <th>Статус</th>
          <th>Дата</th>
          <th>Штабели</th>
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
              <button class="secondary" @click="togglePiles(w)">
                {{ open[w.id] ? 'Скрыть штабели' : 'Показать штабели' }} ({{ w.pileCount }})
              </button>
            </td>
          </tr>
          <tr v-if="open[w.id]">
            <td colspan="5">
              <div v-if="pilesByWarehouse[w.id]?.length" class="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Номер штабеля</th>
                    <th>Объем, т</th>
                    <th>Статус</th>
                    <th>Партии</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in pilesByWarehouse[w.id]" :key="h.id">
                    <td>{{ h.pileNumber }}</td>
                    <td>{{ fmt(h.volume) }}</td>
                    <td>{{ pileStatusLabels[h.status] }}</td>
                    <td>{{ h.batchNumbers.join(', ') || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              </div>
              <span v-else class="muted">Штабелей на складе нет</span>
            </td>
          </tr>
        </template>
        <tr v-if="!rows.length">
          <td colspan="5" class="muted">Складов пока нет</td>
        </tr>
      </tbody>
    </table>
    </div>
    <Pagination
      :page="page"
      :size="size"
      :total-pages="totalPages"
      :total-elements="totalElements"
      :loading="loading"
      @prev="prev"
      @next="next"
      @update:size="setSize"
    />
    </section>

    <Modal v-if="showCreate" title="Новый склад" @close="showCreate = false">
      <div class="form-grid">
        <label>
          Номер
          <div class="flex items-stretch">
            <span
              class="flex items-center rounded-l-[10px] border border-r-0 border-line px-3 text-mute select-none"
            >
              {{ WAREHOUSE_PREFIX }}
            </span>
            <input v-model="form.number" class="!rounded-l-none flex-1 min-w-0" />
          </div>
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
