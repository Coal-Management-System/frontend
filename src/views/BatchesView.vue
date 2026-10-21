<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { batchesApi } from "@/api/coal";
import type { BatchCreateRequest, BatchDto } from "@/api/types";
import {
  batchStatusLabels,
  errMsg,
  fmt,
  fmtDate,
  originLabels,
} from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
import DateTimePicker from "@/components/DateTimePicker.vue";
import Modal from "@/components/Modal.vue";
import Pagination from "@/components/Pagination.vue";
import { usePagedList } from "@/composables/usePagedList";
import { notifyError } from "@/composables/useToast";

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
  setSize,
} = usePagedList<BatchDto>(batchesApi.list);
const showCreate = ref(false);
const saving = ref(false);
const BATCH_PREFIX = "П-";

const form = reactive<
  Omit<BatchCreateRequest, "initialWeight"> & {
    minedAtLocal: string;
    initialWeight: number | null;
  }
>({
  batchNumber: "",
  productType: "",
  coalGrade: "",
  fraction: "",
  originType: "OWN_MINING",
  deposit: "",
  miningSite: "",
  quarry: "",
  shiftPeriod: "",
  supplier: "",
  minedAtLocal: "",
  initialWeight: null,
});

function originOf(b: BatchDto): string {
  return b.originType === "PURCHASED"
    ? b.supplier || "Поставщик"
    : b.miningSite || b.deposit || "—";
}

async function submit() {
  const number = form.batchNumber.trim();
  if (!number) {
    notifyError("Укажите номер партии");
    return;
  }
  saving.value = true;
  try {
    const payload: BatchCreateRequest = {
      batchNumber: `${BATCH_PREFIX}${number}`,
      productType: form.productType || undefined,
      coalGrade: form.coalGrade || undefined,
      fraction: form.fraction || undefined,
      originType: form.originType,
      deposit: form.deposit || undefined,
      miningSite: form.miningSite || undefined,
      quarry: form.quarry || undefined,
      shiftPeriod: form.shiftPeriod || undefined,
      supplier: form.supplier || undefined,
      minedAt: form.minedAtLocal
        ? new Date(form.minedAtLocal).toISOString()
        : undefined,
      initialWeight: form.initialWeight ?? 0,
    };
    await batchesApi.create(payload);
    showCreate.value = false;
    resetForm();
    await load();
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    batchNumber: "",
    productType: "",
    coalGrade: "",
    fraction: "",
    originType: "OWN_MINING",
    deposit: "",
    miningSite: "",
    quarry: "",
    shiftPeriod: "",
    supplier: "",
    minedAtLocal: "",
    initialWeight: null,
  });
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <h1>Партии угля</h1>
      <button @click="showCreate = true">Новая партия +</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>
                Уникальный <br />
                номер партии
              </th>
              <th>Источник <br />происхождения</th>
              <th>
                Участок добычи <br />
                или поставщик
              </th>
              <th>Дата добычи или поступления</th>
              <th>Текущий объем, т</th>
              <th>Место хранения</th>
              <th>Статус партии</th>
              <th>Общая информация</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in rows" :key="b.id">
              <td>{{ b.batchNumber }}</td>
              <td>{{ originLabels[b.originType] }}</td>
              <td>{{ originOf(b) }}</td>
              <td>{{ fmtDate(b.minedAt) }}</td>
              <td>{{ fmt(b.currentRemainder) }}</td>
              <td>{{ b.storageLocations.join(", ") || "—" }}</td>
              <td>{{ batchStatusLabels[b.status] }}</td>
              <td>
                <RouterLink :to="`/batches/${b.id}`" class="btn">
                  Паспорт
                </RouterLink>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="muted">Партий пока нет</td>
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

    <Modal
      v-if="showCreate"
      title="Новая партия угля"
      @close="showCreate = false"
    >
      <div class="form-grid">
        <label>
          Номер партии
          <div class="flex items-stretch">
            <span
              class="flex items-center rounded-l-[10px] border border-r-0 border-line px-3 text-mute select-none"
            >
              {{ BATCH_PREFIX }}
            </span>
            <input
              v-model="form.batchNumber"
              class="!rounded-l-none flex-1 min-w-0"
            />
          </div>
        </label>
        <label>
          Тип продукции
          <input v-model="form.productType" />
        </label>
        <label>
          Марка угля
          <input v-model="form.coalGrade" />
        </label>
        <label>
          Фракция
          <input v-model="form.fraction" />
        </label>
        <label>
          Источник происхождения
          <select v-model="form.originType">
            <option value="OWN_MINING">Собственная добыча</option>
            <option value="PURCHASED">Закупной уголь</option>
          </select>
        </label>
        <label>
          Объем (тонн)
          <DecimalInput v-model="form.initialWeight" />
        </label>
        <label>
          Месторождение
          <input v-model="form.deposit" />
        </label>
        <label>
          Участок добычи
          <input v-model="form.miningSite" />
        </label>
        <label>
          Карьер
          <input v-model="form.quarry" />
        </label>
        <label>
          Смена / производственный период
          <input v-model="form.shiftPeriod" />
        </label>
        <label>
          Поставщик (если уголь закупной)
          <input v-model="form.supplier" />
        </label>
        <label>
          Дата добычи / поступления
          <DateTimePicker v-model="form.minedAtLocal" />
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submit">Добавить</button>
      </div>
    </Modal>
  </div>
</template>
