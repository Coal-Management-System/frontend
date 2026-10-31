<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { batchesApi, dictionaryApi } from "@/api/coal";
import type {
  BatchCreateRequest,
  BatchDto,
  DictionaryField,
  DictionaryMap,
} from "@/api/types";
import {
  batchStatusLabels,
  errMsg,
  fmt,
  fmtDate,
  originLabels,
} from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
import DateTimePicker from "@/components/DateTimePicker.vue";
import AutocompleteInput from "@/components/AutocompleteInput.vue";
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

// Shared vocabulary behind the seven free-text fields, loaded once on open.
const dict = reactive<DictionaryMap>({
  PRODUCT_TYPE: [],
  COAL_GRADE: [],
  FRACTION: [],
  QUARRY: [],
  DEPOSIT: [],
  MINING_SITE: [],
  SUPPLIER: [],
  METHOD: [],
  // Movement places; not used on this page, but the map is typed per field.
  LOCATION: [],
});
const addingField = ref<DictionaryField | null>(null);

async function loadDict() {
  try {
    const data = await dictionaryApi.list();
    Object.assign(dict, data);
  } catch (e) {
    // A failed dictionary load only means no suggestions; typing still works.
    notifyError(errMsg(e));
  }
}

// Persist a newly-typed word, then keep it available locally right away.
async function addWord(field: DictionaryField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  addingField.value = field;
  try {
    await dictionaryApi.add(field, trimmed);
    if (!dict[field].some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      dict[field] = [...dict[field], trimmed].sort((a, b) =>
        a.localeCompare(b),
      );
    }
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    addingField.value = null;
  }
}

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

// A supplier only exists for purchased coal: the field stays disabled for own
// mining, and anything typed before switching origin is dropped so it can never
// be saved onto an OWN_MINING party.
watch(
  () => form.originType,
  (origin) => {
    if (origin !== "PURCHASED") form.supplier = "";
  },
);

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

onMounted(() => {
  load();
  loadDict();
});
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
              <th>Остаток партии, т</th>
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
              <td>{{ fmt(b.remainingVolume) }}</td>
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
          <AutocompleteInput
            v-model="form.productType"
            :options="dict.PRODUCT_TYPE"
            :busy="addingField === 'PRODUCT_TYPE'"
            @add-new="addWord('PRODUCT_TYPE', $event)"
          />
        </label>
        <label>
          Марка угля
          <AutocompleteInput
            v-model="form.coalGrade"
            :options="dict.COAL_GRADE"
            :busy="addingField === 'COAL_GRADE'"
            @add-new="addWord('COAL_GRADE', $event)"
          />
        </label>
        <label>
          Фракция
          <AutocompleteInput
            v-model="form.fraction"
            :options="dict.FRACTION"
            :busy="addingField === 'FRACTION'"
            @add-new="addWord('FRACTION', $event)"
          />
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
          <AutocompleteInput
            v-model="form.deposit"
            :options="dict.DEPOSIT"
            :busy="addingField === 'DEPOSIT'"
            @add-new="addWord('DEPOSIT', $event)"
          />
        </label>
        <label>
          Участок добычи
          <AutocompleteInput
            v-model="form.miningSite"
            :options="dict.MINING_SITE"
            :busy="addingField === 'MINING_SITE'"
            @add-new="addWord('MINING_SITE', $event)"
          />
        </label>
        <label>
          Карьер
          <AutocompleteInput
            v-model="form.quarry"
            :options="dict.QUARRY"
            :busy="addingField === 'QUARRY'"
            @add-new="addWord('QUARRY', $event)"
          />
        </label>
        <label>
          Смена / производственный период
          <input v-model="form.shiftPeriod" />
        </label>
        <label>
          Поставщик (если уголь закупной)
          <AutocompleteInput
            v-model="form.supplier"
            :options="dict.SUPPLIER"
            :busy="addingField === 'SUPPLIER'"
            :disabled="form.originType !== 'PURCHASED'"
            :placeholder="
              form.originType === 'PURCHASED'
                ? ''
                : 'Доступно при источнике «Закупной уголь»'
            "
            @add-new="addWord('SUPPLIER', $event)"
          />
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
