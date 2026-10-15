<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { batchesApi, pilesApi, warehousesApi } from "@/api/coal";
import type { BatchDto, PileDto, MovementDto, WarehouseDto } from "@/api/types";
import {
  errMsg,
  fmt,
  fmtDate,
  pileStatusLabels,
  operationLabels,
} from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
import Modal from "@/components/Modal.vue";

const rows = ref<PileDto[]>([]);
const warehouses = ref<WarehouseDto[]>([]);
const batches = ref<BatchDto[]>([]);
const error = ref("");
const saving = ref(false);
const PILE_PREFIX = "Шт-";

const showCreate = ref(false);
const splitTarget = ref<PileDto | null>(null);
const mergeMode = ref(false);
const transferTarget = ref<PileDto | null>(null);
const historyTarget = ref<PileDto | null>(null);
const history = ref<MovementDto[]>([]);

const createForm = reactive({
  pileNumber: "",
  volume: null as number | null,
  warehouseId: "",
  originSource: "",
  batchIds: [] as string[],
});

const splitForm = reactive({
  volume: null as number | null,
  toWarehouseId: "",
  newBatchNumber: "",
  sendImmediately: false,
});

const mergeForm = reactive({ targetPileId: "", sourcePileIds: [] as string[] });
const transferForm = reactive({ toWarehouseId: "" });

async function load() {
  error.value = "";
  try {
    [rows.value, warehouses.value, batches.value] = await Promise.all([
      pilesApi.list(),
      warehousesApi.list(),
      batchesApi.list(),
    ]);
  } catch (e) {
    error.value = errMsg(e);
  }
}

function openSplit(h: PileDto) {
  splitTarget.value = h;
  splitForm.volume = null;
  splitForm.toWarehouseId = h.warehouseId || "";
  splitForm.newBatchNumber = "";
  splitForm.sendImmediately = false;
}

function openTransfer(h: PileDto) {
  transferTarget.value = h;
  transferForm.toWarehouseId = h.warehouseId || "";
}

async function openHistory(h: PileDto) {
  historyTarget.value = h;
  history.value = await pilesApi.history(h.id);
}

async function submitCreate() {
  error.value = "";
  const number = createForm.pileNumber.trim();
  if (!number) {
    error.value = "Укажите номер штабеля";
    return;
  }
  saving.value = true;
  try {
    await pilesApi.create({
      pileNumber: `${PILE_PREFIX}${number}`,
      volume: createForm.volume ?? 0,
      warehouseId: createForm.warehouseId || null,
      originSource: createForm.originSource || undefined,
      batchIds: createForm.batchIds,
    });
    showCreate.value = false;
    createForm.pileNumber = "";
    createForm.volume = null;
    createForm.batchIds = [];
    await load();
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    saving.value = false;
  }
}

async function submitSplit() {
  if (!splitTarget.value) return;
  saving.value = true;
  error.value = "";
  try {
    await pilesApi.split(splitTarget.value.id, {
      volume: splitForm.volume ?? 0,
      toWarehouseId: splitForm.toWarehouseId || null,
      newBatchNumber: splitForm.newBatchNumber,
      sendImmediately: splitForm.sendImmediately,
    });
    splitTarget.value = null;
    await load();
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    saving.value = false;
  }
}

async function submitMerge() {
  saving.value = true;
  error.value = "";
  try {
    await pilesApi.merge({
      targetPileId: mergeForm.targetPileId,
      sourcePileIds: mergeForm.sourcePileIds,
    });
    mergeMode.value = false;
    mergeForm.sourcePileIds = [];
    mergeForm.targetPileId = "";
    await load();
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    saving.value = false;
  }
}

async function submitTransfer() {
  if (!transferTarget.value) return;
  saving.value = true;
  error.value = "";
  try {
    await pilesApi.transfer(transferTarget.value.id, {
      toWarehouseId: transferForm.toWarehouseId,
    });
    transferTarget.value = null;
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
      <h1>Штабели угля</h1>
      <div class="flex gap-5">
        <button class="secondary" @click="mergeMode = true">Объединить</button>
        <button @click="showCreate = true">Новый штабель +</button>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Номер штабеля</th>
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
              <td>{{ h.pileNumber }}</td>
              <td>{{ fmt(h.volume) }}</td>
              <td>{{ h.warehouseNumber || "—" }}</td>
              <td>{{ pileStatusLabels[h.status] }}</td>
              <td>{{ fmtDate(h.createdAt) }}</td>
              <td>
                {{ h.originSource || "—" }}
                <button class="secondary" @click="openHistory(h)">
                  история
                </button>
              </td>
              <td>{{ h.batchNumbers.join(", ") || "—" }}</td>
              <td class="flex gap-2">
                <button class="secondary" @click="openSplit(h)">
                  Разделить
                </button>
                <button class="secondary" @click="openTransfer(h)">
                  Трансфер
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="muted">Штабелей пока нет</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-if="showCreate" title="Новый штабель" @close="showCreate = false">
      <div class="form-grid">
        <label>
          Номер штабеля
          <div class="flex items-stretch">
            <span
              class="flex items-center rounded-l-[10px] border border-r-0 border-line px-3 text-mute select-none"
            >
              {{ PILE_PREFIX }}
            </span>
            <input
              v-model="createForm.pileNumber"
              class="!rounded-l-none flex-1 min-w-0"
            />
          </div>
        </label>
        <label>
          Объем, т
          <DecimalInput v-model="createForm.volume" />
        </label>
        <label>
          Место хранения (склад)
          <select v-model="createForm.warehouseId">
            <option value="">Без склада</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">
              {{ w.number }}
            </option>
          </select>
        </label>
        <label>
          Источник происхождения
          <input v-model="createForm.originSource" />
        </label>
        <label class="full">
          Партии в штабеле
          <select v-model="createForm.batchIds" multiple size="5">
            <option v-for="b in batches" :key="b.id" :value="b.id">
              {{ b.batchNumber }}
            </option>
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
      :title="`Разделить штабель ${splitTarget.pileNumber}`"
      @close="splitTarget = null"
    >
      <div class="form-grid">
        <label>
          Объем отделения, т
          <DecimalInput v-model="splitForm.volume" />
        </label>
        <label>
          Куда (склад)
          <select v-model="splitForm.toWarehouseId">
            <option v-for="w in warehouses" :key="w.id" :value="w.id">
              {{ w.number }}
            </option>
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
      <p class="muted">
        При разделении штабеля автоматически создается новая партия.
      </p>
      <div class="actions">
        <button class="secondary" @click="splitTarget = null">Отмена</button>
        <button :disabled="saving" @click="submitSplit">Разделить</button>
      </div>
    </Modal>

    <Modal
      v-if="mergeMode"
      title="Объединить штабели"
      @close="mergeMode = false"
    >
      <div class="form-grid">
        <label class="full">
          Целевой штабель
          <select v-model="mergeForm.targetPileId">
            <option value="" disabled>Выберите штабель</option>
            <option v-for="h in rows" :key="h.id" :value="h.id">
              {{ h.pileNumber }}
            </option>
          </select>
        </label>
        <label class="full">
          Штабели-источники
          <select v-model="mergeForm.sourcePileIds" multiple size="6">
            <option v-for="h in rows" :key="h.id" :value="h.id">
              {{ h.pileNumber }}
            </option>
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
      :title="`Трансфер штабеля ${transferTarget.pileNumber}`"
      @close="transferTarget = null"
    >
      <div class="form-grid">
        <label class="full">
          Куда (склад)
          <select v-model="transferForm.toWarehouseId">
            <option v-for="w in warehouses" :key="w.id" :value="w.id">
              {{ w.number }}
            </option>
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
      :title="`История штабеля ${historyTarget.pileNumber}`"
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
              <td>{{ m.fromLocation || "—" }}</td>
              <td>{{ m.toLocation || "—" }}</td>
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
