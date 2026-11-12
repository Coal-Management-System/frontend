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
import { notifyError, notifySuccess } from "@/composables/useToast";

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

// Shared vocabulary behind the seven free-text fields, loaded once on open.
const dict = reactive<DictionaryMap>({
  PRODUCT_TYPE: [],
  COAL_GRADE: [],
  FRACTION: [],
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
  Omit<BatchCreateRequest, "initialWeight" | "batchNumber"> & {
    // Required locally even though the request field is optional: it carries the server's
    // preview, and is only sent when the operator unlocks it.
    batchNumber: string;
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
  shiftPeriod: "",
  supplier: "",
  minedAtLocal: "",
  initialWeight: null,
});

// The number is the server's to assign, so the field normally just shows what the next
// party will be called. Unlocking it lets an operator type a specific number instead —
// for one already written on a paper document, say — which the server then duplicate-checks.
const manualNumber = ref(false);

/** Asks the server what the next number would be; a failed lookup only leaves the field empty. */
async function prepareNumber() {
  manualNumber.value = false;
  form.batchNumber = "";
  try {
    form.batchNumber = await batchesApi.nextNumber();
  } catch {
    // Not worth a toast: the number is still assigned on save, the preview is a convenience.
  }
}

// Refreshed on every open, so a number issued to someone else in the meantime is not shown.
watch(showCreate, (open) => {
  if (open) void prepareNumber();
});

/** Unlocks the field for typing; locking it again restores the server's suggestion. */
function toggleManualNumber() {
  manualNumber.value = !manualNumber.value;
  if (!manualNumber.value) void prepareNumber();
}

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
  // Only an unlocked field is sent: otherwise the server assigns the number itself, which
  // keeps the daily counter authoritative even if the preview went stale while typing.
  const manual = manualNumber.value ? form.batchNumber.trim() : "";
  if (manualNumber.value && !manual) {
    notifyError("Укажите номер партии или верните автоматическую нумерацию");
    return;
  }
  saving.value = true;
  try {
    const payload: BatchCreateRequest = {
      batchNumber: manual || undefined,
      productType: form.productType || undefined,
      coalGrade: form.coalGrade || undefined,
      fraction: form.fraction || undefined,
      originType: form.originType,
      deposit: form.deposit || undefined,
      miningSite: form.miningSite || undefined,
      shiftPeriod: form.shiftPeriod || undefined,
      supplier: form.supplier || undefined,
      minedAt: form.minedAtLocal
        ? new Date(form.minedAtLocal).toISOString()
        : undefined,
      initialWeight: form.initialWeight ?? 0,
    };
    // The final number comes from the server, so the toast reports what was really assigned
    // rather than the preview the form showed before saving.
    const created = await batchesApi.create(payload);
    notifySuccess(`Партия ${created.batchNumber} создана`);
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
        <div class="field full">
          <span class="flex items-center justify-between gap-2">
            Номер партии
            <button
              type="button"
              class="shrink-0 rounded-lg border border-line px-2 py-0.5 text-[0.7rem] text-mute hover:text-ink"
              @click="toggleManualNumber"
            >
              {{ manualNumber ? "Автономер" : "Изменить" }}
            </button>
          </span>
          <input
            v-model="form.batchNumber"
            :disabled="!manualNumber"
            :placeholder="manualNumber ? 'Например, П-261102-007' : ''"
          />
        </div>
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
      <p class="muted">
        Номер партии присваивается автоматически по шаблону «П-ГГММДД-№»
        (например, П-261102-001): счётчик дня растет на единицу с каждой новой
        партией, поэтому два оператора, сохраняющие одновременно, получат разные
        номера. Поле выше показывает номер заранее, но не бронирует его — если
        кто-то сохранит партию раньше, ваша получит следующий. Кнопка «Изменить»
        разблокирует поле, чтобы задать свой номер; повторное нажатие вернет
        автоматический.
      </p>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submit">Добавить</button>
      </div>
    </Modal>
  </div>
</template>
