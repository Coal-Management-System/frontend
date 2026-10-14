<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { batchesApi, labsApi, qrImageUrl } from "@/api/coal";
import type {
  AnalysisDto,
  BatchDto,
  BatchStatus,
  BatchUpdateRequest,
  OriginType,
  QualityHistoryRow,
} from "@/api/types";
import {
  batchStatusLabels,
  errMsg,
  fmt,
  fmtDate,
  indicatorLabels,
  originLabels,
  stageLabels,
} from "@/lib/format";

const route = useRoute();
const id = route.params.id as string;

const batch = ref<BatchDto | null>(null);
const history = ref<QualityHistoryRow[]>([]);
const analyses = ref<AnalysisDto[]>([]);
const error = ref("");
const saving = ref(false);
const saved = ref(false);
const tab = ref<"general" | "origin" | "quantity" | "quality" | "qr">(
  "general",
);

const form = reactive({
  batchNumber: "",
  productType: "",
  status: "NEW" as BatchStatus,
  coalGrade: "",
  fraction: "",
  originType: "OWN_MINING" as OriginType,
  deposit: "",
  miningSite: "",
  quarry: "",
  shiftPeriod: "",
  supplier: "",
  minedAtLocal: "",
  initialWeight: null as number | null,
});

const weightText = ref(form.initialWeight?.toString() ?? "");
function onWeightInput(e: Event) {
  const el = e.target as HTMLInputElement;
  let v = el.value
    .replace(",", ".") // allow comma as decimal separator
    .replace(/[^\d.]/g, "") // digits and dot only
    .replace(/(\..*)\./g, "$1") // single dot
    .replace(/^(\d*\.\d{0,2}).*$/, "$1"); // max 2 decimals
  el.value = v; // force the visible value
  weightText.value = v;
  form.initialWeight = v === "" || v === "." ? null : Number(v);
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

function fillForm(b: BatchDto) {
  form.batchNumber = b.batchNumber;
  form.productType = b.productType ?? "";
  form.status = b.status;
  form.coalGrade = b.coalGrade ?? "";
  form.fraction = b.fraction ?? "";
  form.originType = b.originType;
  form.deposit = b.deposit ?? "";
  form.miningSite = b.miningSite ?? "";
  form.quarry = b.quarry ?? "";
  form.shiftPeriod = b.shiftPeriod ?? "";
  form.supplier = b.supplier ?? "";
  form.minedAtLocal = toLocalInput(b.minedAt);
  form.initialWeight = b.initialWeight;
}

onMounted(async () => {
  try {
    batch.value = await batchesApi.get(id);
    fillForm(batch.value);
    history.value = await batchesApi.qualityHistory(id);
    analyses.value = await labsApi.analyses(id);
  } catch (e) {
    error.value = errMsg(e);
  }
});

async function save() {
  if (!batch.value) return;
  saving.value = true;
  saved.value = false;
  error.value = "";
  try {
    const payload: BatchUpdateRequest = {
      batchNumber: form.batchNumber.trim(),
      productType: form.productType || undefined,
      status: form.status,
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
      initialWeight: form.initialWeight as number,
    };
    batch.value = await batchesApi.update(batch.value.id, payload);
    fillForm(batch.value);
    saved.value = true;
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  if (batch.value) fillForm(batch.value);
  saved.value = false;
  error.value = "";
}
</script>

<template>
  <div>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else-if="batch">
      <div class="toolbar">
        <h1>Паспорт партии № {{ batch.batchNumber }}</h1>
        <div class="actions">
          <span v-if="saved" class="hint">Изменения сохранены</span>
          <button class="secondary" :disabled="saving" @click="resetForm">
            Сбросить
          </button>
          <button :disabled="saving" @click="save">Сохранить</button>
          <RouterLink to="/batches" class="btn secondary">К списку</RouterLink>
        </div>
      </div>

      <div class="tabs">
        <button :class="{ active: tab === 'general' }" @click="tab = 'general'">
          Общая информация
        </button>
        <button :class="{ active: tab === 'origin' }" @click="tab = 'origin'">
          Происхождение
        </button>
        <button
          :class="{ active: tab === 'quantity' }"
          @click="tab = 'quantity'"
        >
          Количественные показатели
        </button>
        <button :class="{ active: tab === 'quality' }" @click="tab = 'quality'">
          Показатели качества
        </button>
        <button :class="{ active: tab === 'qr' }" @click="tab = 'qr'">
          QR Code
        </button>
      </div>

      <section v-if="tab === 'general'" class="panel">
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
            Текущий статус
            <select v-model="form.status">
              <option
                v-for="(label, key) in batchStatusLabels"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select>
          </label>
          <label>
            Марка угля
            <input v-model="form.coalGrade" />
          </label>
          <label>
            Фракция
            <input v-model="form.fraction" />
          </label>
        </div>
        <p class="muted mt-3.5 mb-0 text-xs">
          Дата создания: {{ fmtDate(batch.createdAt) }}
        </p>
      </section>

      <section v-else-if="tab === 'origin'" class="panel">
        <div class="form-grid">
          <label>
            Источник образования партии
            <select v-model="form.originType">
              <option
                v-for="(label, key) in originLabels"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select>
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
            Поставщик
            <input v-model="form.supplier" />
          </label>
          <label>
            Дата добычи или поступления
            <input v-model="form.minedAtLocal" type="datetime-local" />
          </label>
        </div>
        <dl class="kv mt-4">
          <dt>Партии-источники</dt>
          <dd>{{ batch.sourceBatchNumbers.join(", ") || "—" }}</dd>
          <dt>Кучи</dt>
          <dd>{{ batch.heapNumbers.join(", ") || "—" }}</dd>
        </dl>
      </section>

      <section v-else-if="tab === 'quantity'" class="panel">
        <div class="form-grid">
          <label>
            Первоначальный вес, т
            <input
              v-model.number="form.initialWeight"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              @input="onWeightInput"
            />
          </label>
        </div>
        <dl class="kv mt-4">
          <dt>Текущий остаток, т</dt>
          <dd>{{ fmt(batch.currentRemainder) }}</dd>
          <dt>Зарезервированный объем, т</dt>
          <dd>{{ fmt(batch.reservedVolume) }}</dd>
          <dt>Свободный объем, т</dt>
          <dd>{{ fmt(batch.freeVolume) }}</dd>
          <dt>Объем в переработке, т</dt>
          <dd>{{ fmt(batch.inProcessingVolume) }}</dd>
          <dt>Объем отгруженной продукции, т</dt>
          <dd>{{ fmt(batch.shippedVolume) }}</dd>
          <dt>Потери, т</dt>
          <dd>{{ fmt(batch.losses) }}</dd>
        </dl>
        <p class="muted mt-3.5 mb-0 text-xs">
          Остальные объемы изменяются операциями движения продукции и не
          редактируются вручную.
        </p>
      </section>

      <div v-else-if="tab === 'quality'">
        <section class="panel">
          <h2>История качества</h2>
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Зольность</th>
                  <th>Влажность</th>
                  <th>Калорийность</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(h, i) in history" :key="i">
                  <td>{{ fmtDate(h.analysisDate) }}</td>
                  <td>{{ h.ash === null ? "—" : h.ash + "%" }}</td>
                  <td>{{ h.moisture === null ? "—" : h.moisture + "%" }}</td>
                  <td>{{ fmt(h.calorific) }}</td>
                  <td>{{ stageLabels[h.stage] }}</td>
                </tr>
                <tr v-if="!history.length">
                  <td colspan="5" class="muted">Анализов пока нет</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel mt-10">
          <h2>Результаты анализов</h2>
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Номер пробы</th>
                  <th>Лаборатория</th>
                  <th>Показатели</th>
                  <th>№ протокола</th>
                  <th>Ответственный</th>
                  <th>Метод</th>
                  <th>Этап</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in analyses" :key="a.id">
                  <td>{{ a.sampleNumber }}</td>
                  <td>{{ a.labName }}</td>
                  <td>
                    <div v-for="v in a.values" :key="v.indicator">
                      {{ indicatorLabels[v.indicator] }}: {{ v.value
                      }}{{ v.unit ? " " + v.unit : "" }}
                    </div>
                  </td>
                  <td>{{ a.protocolNumber || "—" }}</td>
                  <td>{{ a.responsibleEmployee || "—" }}</td>
                  <td>{{ a.method || "—" }}</td>
                  <td>{{ stageLabels[a.stage] }}</td>
                </tr>
                <tr v-if="!analyses.length">
                  <td colspan="7" class="muted">Анализов пока нет</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p class="muted">
          Добавить результат анализа можно в разделе «Лаборатории».
        </p>
      </div>

      <div v-else class="qr-box">
        <img
          :src="qrImageUrl('batch', batch.id)"
          alt="QR-код партии"
          width="320"
          height="320"
        />
        <p class="muted">QR-код партии {{ batch.batchNumber }}</p>
      </div>
    </template>
    <p v-else class="muted">Загрузка…</p>
  </div>
</template>
