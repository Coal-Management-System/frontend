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
import Modal from "@/components/Modal.vue";

const rows = ref<BatchDto[]>([]);
const error = ref("");
const showCreate = ref(false);
const saving = ref(false);

const form = reactive<BatchCreateRequest & { minedAtLocal: string }>({
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
  initialWeight: 0,
});

async function load() {
  error.value = "";
  try {
    rows.value = await batchesApi.list();
  } catch (e) {
    error.value = errMsg(e);
  }
}

function originOf(b: BatchDto): string {
  return b.originType === "PURCHASED"
    ? b.supplier || "Поставщик"
    : b.miningSite || b.deposit || "—";
}

async function submit() {
  saving.value = true;
  error.value = "";
  try {
    const payload: BatchCreateRequest = {
      batchNumber: form.batchNumber,
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
      initialWeight: form.initialWeight,
    };
    await batchesApi.create(payload);
    showCreate.value = false;
    resetForm();
    await load();
  } catch (e) {
    error.value = errMsg(e);
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
    initialWeight: 0,
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
    </section>

    <Modal
      v-if="showCreate"
      title="Новая партия угля"
      @close="showCreate = false"
    >
      <div class="form-grid">
        <label>
          Номер партии
          <input v-model="form.batchNumber" required />
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
          <input
            v-model.number="form.initialWeight"
            type="number"
            min="0"
            step="0.01"
          />
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
          <input v-model="form.minedAtLocal" type="datetime-local" />
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submit">Добавить</button>
      </div>
    </Modal>
  </div>
</template>
