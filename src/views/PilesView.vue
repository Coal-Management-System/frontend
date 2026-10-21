<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { batchesApi, pilesApi, warehousesApi } from "@/api/coal";
import type { BatchDto, MovementDto, OptionDto, PileDto } from "@/api/types";
import {
  errMsg,
  fmt,
  fmtDate,
  pileStatusLabels,
  operationLabels,
} from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
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
} = usePagedList<PileDto>(pilesApi.list);

// Dropdowns read the unpaged /options endpoints, otherwise they would truncate at 10 rows.
const warehouseOptions = ref<OptionDto[]>([]);
const batchOptions = ref<OptionDto[]>([]);
const pileOptions = ref<OptionDto[]>([]);
const saving = ref(false);
const PILE_PREFIX = "Шт-";

const showCreate = ref(false);
const splitTarget = ref<PileDto | null>(null);
const mergeMode = ref(false);
const transferTarget = ref<PileDto | null>(null);
const historyTarget = ref<PileDto | null>(null);
const history = ref<MovementDto[]>([]);

// Popover listing every party inside a pile. Anchored with fixed positioning
// (viewport coords) and teleported to <body> so the table's overflow-x-auto
// wrapper never clips it.
const popover = ref<{
  pileId: string;
  top: number;
  left: number;
  numbers: string[];
  ids: string[];
} | null>(null);

function togglePopover(h: PileDto, ev: MouseEvent) {
  if (popover.value?.pileId === h.id) {
    popover.value = null;
    return;
  }
  const btn = ev.currentTarget as HTMLElement;
  const r = btn.getBoundingClientRect();
  popover.value = {
    pileId: h.id,
    top: r.bottom + 6,
    left: r.left,
    numbers: h.batchNumbers,
    ids: h.batchIds,
  };
}

function closePopover() {
  popover.value = null;
}

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
const acceptTarget = ref<PileDto | null>(null);
const acceptForm = reactive({ batchId: "", volume: null as number | null });
// The picked party, loaded on demand so the volume field can prefill its free remainder.
const acceptBatch = ref<BatchDto | null>(null);
const acceptBatchLoading = ref(false);

async function loadOptions() {
  try {
    [warehouseOptions.value, batchOptions.value, pileOptions.value] =
      await Promise.all([
        warehousesApi.options(),
        batchesApi.options(),
        pilesApi.options(),
      ]);
  } catch (e) {
    notifyError(errMsg(e));
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

function openAccept(h: PileDto) {
  acceptTarget.value = h;
  acceptForm.batchId = "";
  acceptForm.volume = null;
  acceptBatch.value = null;
}

// Parties already inside the pile cannot be accepted twice; the option is
// disabled and annotated so the reason is visible without hitting the backend.
function isLinked(batchId: string): boolean {
  return acceptTarget.value?.batchIds.includes(batchId) ?? false;
}

async function onAcceptBatchChange() {
  acceptBatch.value = null;
  acceptForm.volume = null;
  if (!acceptForm.batchId) return;
  acceptBatchLoading.value = true;
  try {
    const batch = await batchesApi.get(acceptForm.batchId);
    // Ignore a late response if the user already picked another party.
    if (acceptForm.batchId !== batch.id) return;
    acceptBatch.value = batch;
    acceptForm.volume = batch.freeVolume;
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    acceptBatchLoading.value = false;
  }
}

async function submitAccept() {
  if (!acceptTarget.value) return;
  if (!acceptForm.batchId) {
    notifyError("Выберите партию");
    return;
  }
  saving.value = true;
  try {
    await pilesApi.acceptBatch(acceptTarget.value.id, {
      batchId: acceptForm.batchId,
      volume: acceptForm.volume ?? 0,
    });
    acceptTarget.value = null;
    await Promise.all([load(), loadOptions()]);
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

async function openHistory(h: PileDto) {
  historyTarget.value = h;
  try {
    history.value = await pilesApi.history(h.id);
  } catch (e) {
    historyTarget.value = null;
    notifyError(errMsg(e));
  }
}

async function submitCreate() {
  const number = createForm.pileNumber.trim();
  if (!number) {
    notifyError("Укажите номер штабеля");
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
    await Promise.all([load(), loadOptions()]);
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

async function submitSplit() {
  if (!splitTarget.value) return;
  saving.value = true;
  try {
    await pilesApi.split(splitTarget.value.id, {
      volume: splitForm.volume ?? 0,
      toWarehouseId: splitForm.toWarehouseId || null,
      newBatchNumber: splitForm.newBatchNumber,
      sendImmediately: splitForm.sendImmediately,
    });
    splitTarget.value = null;
    await Promise.all([load(), loadOptions()]);
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

async function submitMerge() {
  saving.value = true;
  try {
    await pilesApi.merge({
      targetPileId: mergeForm.targetPileId,
      sourcePileIds: mergeForm.sourcePileIds,
    });
    mergeMode.value = false;
    mergeForm.sourcePileIds = [];
    mergeForm.targetPileId = "";
    await Promise.all([load(), loadOptions()]);
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

async function submitTransfer() {
  if (!transferTarget.value) return;
  saving.value = true;
  try {
    await pilesApi.transfer(transferTarget.value.id, {
      toWarehouseId: transferForm.toWarehouseId,
    });
    transferTarget.value = null;
    await load();
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
  void loadOptions();
  // Outside click / scroll / resize dismiss the parties popover.
  document.addEventListener("click", closePopover);
  window.addEventListener("scroll", closePopover, true);
  window.addEventListener("resize", closePopover);
});

onUnmounted(() => {
  document.removeEventListener("click", closePopover);
  window.removeEventListener("scroll", closePopover, true);
  window.removeEventListener("resize", closePopover);
});
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
              <td class="w-full flex justify-between items-center">
                <div
                  class="w-[min(250px,75%)] flex justify-between items-center"
                >
                  {{ h.originSource || "—" }}
                  <button class="secondary" @click="openHistory(h)">
                    история
                  </button>
                </div>
              </td>
              <td>
                <button
                  v-if="h.batchNumbers.length"
                  class="batch-chip"
                  :class="{
                    'batch-chip--open': popover?.pileId === h.id,
                  }"
                  @click.stop="togglePopover(h, $event)"
                >
                  <span class="batch-chip__label">
                    {{ h.batchNumbers[0] }}
                  </span>
                  <span
                    v-if="h.batchNumbers.length > 1"
                    class="batch-chip__more"
                  >
                    +{{ h.batchNumbers.length - 1 }}
                  </span>
                  <svg
                    class="batch-chip__caret"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <span v-else class="muted">—</span>
              </td>
              <td class="flex gap-2">
                <button class="secondary" @click="openAccept(h)">
                  Принять партию
                </button>
                <button class="secondary" @click="openSplit(h)">
                  Разделить
                </button>
                <button class="secondary" @click="openTransfer(h)">
                  Трансфер
                </button>
              </td>            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="muted">Штабелей пока нет</td>
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
            <option v-for="o in warehouseOptions" :key="o.id" :value="o.id">
              {{ o.label }}
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
            <option v-for="o in batchOptions" :key="o.id" :value="o.id">
              {{ o.label }}
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
            <option v-for="o in warehouseOptions" :key="o.id" :value="o.id">
              {{ o.label }}
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
            <option v-for="o in pileOptions" :key="o.id" :value="o.id">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label class="full">
          Штабели-источники
          <select v-model="mergeForm.sourcePileIds" multiple size="6">
            <option v-for="o in pileOptions" :key="o.id" :value="o.id">
              {{ o.label }}
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
      v-if="acceptTarget"
      :title="`Принять партию в штабель ${acceptTarget.pileNumber}`"
      @close="acceptTarget = null"
    >
      <div class="form-grid">
        <label class="full">
          Партия
          <select v-model="acceptForm.batchId" @change="onAcceptBatchChange">
            <option value="" disabled>Выберите партию</option>
            <option
              v-for="o in batchOptions"
              :key="o.id"
              :value="o.id"
              :disabled="isLinked(o.id)"
            >
              {{ o.label }}{{ isLinked(o.id) ? " — уже в штабеле" : "" }}
            </option>
          </select>
        </label>
        <label>
          Объем, т
          <DecimalInput v-model="acceptForm.volume" />
        </label>
      </div>
      <p v-if="acceptBatchLoading" class="muted">Загрузка остатка партии…</p>
      <p v-else-if="acceptBatch" class="muted">
        Свободный остаток партии {{ acceptBatch.batchNumber }}:
        {{ fmt(acceptBatch.freeVolume) }} т — подставлен в объем, можно
        уменьшить.
      </p>
      <p v-else class="muted">
        Выберите партию — её свободный остаток подставится в объем
        автоматически.
      </p>
      <p class="muted">
        Объем штабеля увеличится на указанный; размер партии не меняется.
      </p>
      <div class="actions">
        <button class="secondary" @click="acceptTarget = null">Отмена</button>
        <button :disabled="saving || acceptBatchLoading" @click="submitAccept">
          Принять
        </button>
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
            <option v-for="o in warehouseOptions" :key="o.id" :value="o.id">
              {{ o.label }}
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

    <Teleport to="body">
      <div
        v-if="popover"
        class="batch-popover"
        :style="{ top: popover.top + 'px', left: popover.left + 'px' }"
        @click.stop
      >
        <p class="batch-popover__title">Партии в штабеле</p>
        <ul class="batch-popover__list">
          <li v-for="(num, i) in popover.numbers" :key="popover.ids[i] ?? i">
            <RouterLink
              v-if="popover.ids[i]"
              class="batch-popover__item"
              :to="`/batches/${popover.ids[i]}`"
              @click="closePopover"
            >
              {{ num }}
            </RouterLink>
            <span v-else class="batch-popover__item">{{ num }}</span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.batch-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--secondary-bg);
  color: var(--color-ink);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.batch-chip:hover,
.batch-chip--open {
  background: var(--secondary-bg-hover);
  border-color: var(--color-neon-cyan);
  box-shadow: var(--secondary-hover-shadow);
}

.batch-chip__more {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-wash);
  color: var(--color-neon-cyan);
  font-size: 0.75rem;
  font-weight: 700;
}

.batch-chip__caret {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.7;
}

.batch-popover {
  position: fixed;
  z-index: 60;
  min-width: 210px;
  max-width: 320px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--color-line);
  background: linear-gradient(160deg, var(--modal-a), var(--modal-b));
  box-shadow: var(--modal-shadow);
}

.batch-popover__title {
  margin: 0 0 8px;
  padding: 0 4px;
  color: var(--color-mute);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.batch-popover__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
}

.batch-popover__item {
  display: block;
  padding: 6px 10px;
  border-radius: 9px;
  color: var(--color-ink);
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.12s ease;
}

a.batch-popover__item:hover {
  background: var(--accent-wash);
  color: var(--color-neon-cyan);
}
</style>
