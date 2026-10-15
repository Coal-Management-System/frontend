<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { batchesApi, labsApi } from "@/api/coal";
import type {
  AnalysisCreateRequest,
  AnalysisDto,
  BatchDto,
  Indicator,
  LabDto,
} from "@/api/types";
import { errMsg, fmtDate, indicatorLabels, stageLabels } from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
import Modal from "@/components/Modal.vue";

const labs = ref<LabDto[]>([]);
const analyses = ref<AnalysisDto[]>([]);
const batches = ref<BatchDto[]>([]);
const error = ref("");
const showLab = ref(false);
const showAnalysis = ref(false);
const saving = ref(false);
const labName = ref("");
const SAMPLE_PREFIX = "Пр-";

const indicators = Object.keys(indicatorLabels) as Indicator[];

interface ValueRow {
  indicator: Indicator;
  value: number | null;
  unit: string;
}

const form = reactive({
  sampleNumber: "",
  batchId: "",
  labId: "",
  protocolNumber: "",
  responsibleEmployee: "",
  method: "",
  analysisDateLocal: "",
  stage: "INITIAL" as AnalysisCreateRequest["stage"],
  values: [] as ValueRow[],
});

async function load() {
  error.value = "";
  try {
    [labs.value, analyses.value, batches.value] = await Promise.all([
      labsApi.labs(),
      labsApi.analyses(),
      batchesApi.list(),
    ]);
  } catch (e) {
    error.value = errMsg(e);
  }
}

function addRow() {
  form.values.push({ indicator: "ASH", value: null, unit: "%" });
}

async function submitLab() {
  saving.value = true;
  error.value = "";
  try {
    await labsApi.createLab(labName.value);
    labName.value = "";
    showLab.value = false;
    await load();
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    saving.value = false;
  }
}

async function submitAnalysis() {
  error.value = "";
  const sample = form.sampleNumber.trim();
  if (!sample) {
    error.value = "Укажите номер пробы";
    return;
  }
  saving.value = true;
  try {
    const req: AnalysisCreateRequest = {
      sampleNumber: `${SAMPLE_PREFIX}${sample}`,
      batchId: form.batchId,
      labId: form.labId,
      protocolNumber: form.protocolNumber || undefined,
      responsibleEmployee: form.responsibleEmployee || undefined,
      method: form.method || undefined,
      analysisDate: form.analysisDateLocal
        ? new Date(form.analysisDateLocal).toISOString()
        : undefined,
      stage: form.stage,
      values: form.values.map((v) => ({
        indicator: v.indicator,
        value: v.value ?? 0,
        unit: v.unit || undefined,
      })),
    };
    await labsApi.createAnalysis(req);
    showAnalysis.value = false;
    form.sampleNumber = "";
    form.values = [];
    await load();
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <h1>Лаборатории</h1>
      <div class="flex gap-5">
        <button class="secondary" @click="showLab = true">
          Новая лаборатория +
        </button>
        <button @click="showAnalysis = true">Добавить результат +</button>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="panel">
      <h2>Лаборатории</h2>
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Название</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in labs" :key="l.id" class="hover:cursor-pointer">
              <td>{{ l.name }}</td>
            </tr>
            <tr v-if="!labs.length">
              <td class="muted">Лабораторий пока нет</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel mt-10">
      <h2>Результаты анализа угля</h2>
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Номер пробы</th>
              <th>Номер партии</th>
              <th>Результаты</th>
              <th>Этап</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in analyses" :key="a.id">
              <td>{{ a.sampleNumber }}</td>
              <td>{{ a.batchNumber }}</td>
              <td>
                <div v-for="v in a.values" :key="v.indicator">
                  {{ indicatorLabels[v.indicator] }}: {{ v.value
                  }}{{ v.unit ? " " + v.unit : "" }}
                </div>
              </td>
              <td>{{ stageLabels[a.stage] }}</td>
              <td>{{ fmtDate(a.analysisDate) }}</td>
            </tr>
            <tr v-if="!analyses.length">
              <td colspan="5" class="muted">Результатов пока нет</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-if="showLab" title="Новая лаборатория" @close="showLab = false">
      <div class="form-grid">
        <label class="full">
          Название
          <input v-model="labName" />
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="showLab = false">Отмена</button>
        <button :disabled="saving" @click="submitLab">Добавить</button>
      </div>
    </Modal>

    <Modal
      v-if="showAnalysis"
      title="Результат анализа угля"
      @close="showAnalysis = false"
    >
      <div class="form-grid">
        <label>
          Номер пробы
          <div class="flex items-stretch">
            <span
              class="flex items-center rounded-l-[10px] border border-r-0 border-line px-3 text-mute select-none"
            >
              {{ SAMPLE_PREFIX }}
            </span>
            <input
              v-model="form.sampleNumber"
              class="!rounded-l-none flex-1 min-w-0"
            />
          </div>
        </label>
        <label>
          Номер партии
          <select v-model="form.batchId">
            <option value="" disabled>Выберите партию</option>
            <option v-for="b in batches" :key="b.id" :value="b.id">
              {{ b.batchNumber }}
            </option>
          </select>
        </label>
        <label>
          Лаборатория
          <select v-model="form.labId">
            <option value="" disabled>Выберите лабораторию</option>
            <option v-for="l in labs" :key="l.id" :value="l.id">
              {{ l.name }}
            </option>
          </select>
        </label>
        <label>
          Этап
          <select v-model="form.stage">
            <option value="INITIAL">Исходный анализ</option>
            <option value="AFTER_ENRICHMENT">После обогащения</option>
            <option value="BEFORE_SHIPMENT">Перед отгрузкой</option>
          </select>
        </label>
        <label>
          № протокола
          <input v-model="form.protocolNumber" />
        </label>
        <label>
          Ответственный сотрудник
          <input v-model="form.responsibleEmployee" />
        </label>
        <label>
          Метод анализа
          <input v-model="form.method" />
        </label>
        <label>
          Дата анализа
          <input v-model="form.analysisDateLocal" type="datetime-local" />
        </label>
      </div>

      <h2>Показатели</h2>
      <div v-for="(v, i) in form.values" :key="i" class="form-grid">
        <label>
          Показатель
          <select v-model="v.indicator">
            <option v-for="ind in indicators" :key="ind" :value="ind">
              {{ indicatorLabels[ind] }}
            </option>
          </select>
        </label>
        <label>
          Фактическое значение
          <DecimalInput v-model="v.value" :decimals="3" />
        </label>
        <label>
          Единица
          <input v-model="v.unit" placeholder="% , ккал/кг…" />
        </label>
      </div>
      <button class="secondary" @click="addRow">+ показатель</button>

      <div class="actions">
        <button class="secondary" @click="showAnalysis = false">Отмена</button>
        <button :disabled="saving" @click="submitAnalysis">Добавить</button>
      </div>
    </Modal>
  </div>
</template>
