<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import {
  batchesApi,
  dictionaryApi,
  pilesApi,
  movementsApi,
  qrImageUrl,
} from "@/api/coal";
import type {
  MovementCreateRequest,
  MovementDto,
  MovementOperation,
  OptionDto,
} from "@/api/types";
import { errMsg, fmt, fmtDate, operationLabels } from "@/lib/format";
import AutocompleteInput from "@/components/AutocompleteInput.vue";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal.vue";
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
  first,
  prev,
  next,
  setSize,
} = usePagedList<MovementDto>(movementsApi.list);
const batchOptions = ref<OptionDto[]>([]);
const pileOptions = ref<OptionDto[]>([]);
const showCreate = ref(false);
const saving = ref(false);
const qrTarget = ref<MovementDto | null>(null);

// Destructive delete. A movement has no unique name, so the confirmation word
// is its operation code (e.g. SHIPMENT), matching the backend check.
const deleteTarget = ref<MovementDto | null>(null);
const deleting = ref(false);

function openDelete(m: MovementDto) {
  deleteTarget.value = m;
}

async function confirmDelete(adminKey: string, text: string) {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await movementsApi.remove(deleteTarget.value.id, adminKey, text);
    deleteTarget.value = null;
    // The delete gave volumes back, so every remembered figure may be stale now.
    for (const id of Object.keys(batchInfoCache)) delete batchInfoCache[id];
    await load();
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    deleting.value = false;
  }
}

const form = reactive<
  Omit<MovementCreateRequest, "volume"> & {
    batchId: string;
    pileId: string;
    volume: number | null;
  }
>({
  batchId: "",
  pileId: "",
  operation: "PILE_TRANSFERRED",
  volume: null,
  fromLocation: "",
  toLocation: "",
  originSource: "",
});

// Number + volumes of every party already looked up, so re-picking a party
// costs no request.
const batchInfoCache = reactive<
  Record<string, { number: string; remaining: number; free: number }>
>({});
// Explains why the suggested volume is smaller than expected, or stayed empty.
const volumeHint = ref("");

// What each operation really does, shown before saving so nobody has to guess whether a
// record moves volumes or only lands in the journal. Mirrors MovementService.apply.
const operationEffects: Record<MovementOperation, string> = {
  PROCESSING:
    "Увеличивает «Объем в переработке, т», уменьшает свободный объем партии и объем штабеля — уголь ушел на обогащение.",
  SHIPMENT:
    "Увеличивает «Объем отгруженной продукции, т», уменьшает текущий остаток партии и объем штабеля.",
  ANALYSIS:
    "Журнальная запись: объемы партии и штабеля не меняются.",
  RESERVATION:
    "Увеличивает «Зарезервированный объем, т» и уменьшает свободный объем партии; уголь остается лежать в штабеле.",
  BLENDING:
    "Журнальная запись: объемы партии и штабеля не меняются.",
  PILE_CREATED:
    "Журнальная запись: штабель создается на странице «Штабели».",
  PILE_MERGED:
    "Журнальная запись: слияние выполняется на странице «Штабели».",
  PILE_SPLIT:
    "Журнальная запись: разделение выполняется на странице «Штабели».",
  PILE_TRANSFERRED:
    "Журнальная запись: перемещение штабеля между складами выполняется кнопкой «Трансфер» на странице «Штабели».",
  BATCH_ACCEPTED_INTO_PILE:
    "Приём партии в штабель выполняется на странице «Штабели» — там объем прибавляется к штабелю и списывается с остатка партии.",
};

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

// Picking a party fills «Объем, т» with what can actually be moved; clearing the
// party empties it. With a pile named that is the party's free volume. Without one
// only coal outside piles qualifies (the «Остаток партии, т» of the parties list),
// unless the operation is a reservation, which leaves the coal where it lies.
async function syncVolumeFromBatch() {
  const id = form.batchId;
  if (!id) {
    form.volume = null;
    volumeHint.value = "";
    return;
  }
  if (!(id in batchInfoCache)) {
    try {
      const b = await batchesApi.get(id);
      batchInfoCache[id] = {
        number: b.batchNumber,
        remaining: b.remainingVolume ?? 0,
        free: b.freeVolume ?? 0,
      };
    } catch (e) {
      // Leave whatever the user typed rather than clearing it on a failed lookup.
      notifyError(errMsg(e));
      return;
    }
  }
  const { number, remaining, free } = batchInfoCache[id];
  const fromAnywhere = !!form.pileId || form.operation === "RESERVATION";
  const usable = fromAnywhere ? free : Math.min(remaining, free);
  if (usable > 0) {
    form.volume = round2(usable);
    volumeHint.value =
      usable < free
        ? `Вне штабелей у партии ${number} — ${fmt(usable)} т, свободно всего ${fmt(free)} т: чтобы взять больше, выберите штабель.`
        : "";
  } else if (free > 0) {
    // All of the free coal lies in piles, so a movement without a pile would be refused.
    form.volume = null;
    volumeHint.value = `Партия ${number} лежит в штабеле (свободно ${fmt(free)} т) — выберите штабель.`;
  } else {
    // The backend rejects a non-positive volume, so nothing is filled in.
    form.volume = null;
    volumeHint.value = `У партии ${number} нет свободного объема.`;
  }
}

watch(
  () => [form.batchId, form.pileId, form.operation],
  () => {
    void syncVolumeFromBatch();
  },
);

async function loadOptions() {
  try {
    [batchOptions.value, pileOptions.value] = await Promise.all([
      batchesApi.options(),
      pilesApi.options(),
    ]);
  } catch (e) {
    notifyError(errMsg(e));
  }
}

// «Откуда» and «Куда» share one place vocabulary, so a warehouse, shaft or
// station typed once is offered in both directions afterwards.
const locationWords = ref<string[]>([]);
// Which of the two fields is currently saving a new place, so only that one
// shows its dropdown as busy.
const addingLocation = ref<"from" | "to" | null>(null);

async function loadDict() {
  try {
    locationWords.value = (await dictionaryApi.list()).LOCATION ?? [];
  } catch (e) {
    // Without suggestions the fields still accept free text, so this is a warning.
    notifyError(errMsg(e));
  }
}

// Persist a newly-typed place, then keep it selectable locally right away.
async function addLocation(which: "from" | "to", value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  addingLocation.value = which;
  try {
    await dictionaryApi.add("LOCATION", trimmed);
    if (
      !locationWords.value.some(
        (v) => v.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      locationWords.value = [...locationWords.value, trimmed].sort((a, b) =>
        a.localeCompare(b),
      );
    }
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    addingLocation.value = null;
  }
}

async function submit() {
  saving.value = true;
  const movedBatchId = form.batchId;
  try {
    await movementsApi.create({
      batchId: form.batchId || null,
      pileId: form.pileId || null,
      operation: form.operation,
      volume: form.volume ?? 0,
      fromLocation: form.fromLocation || undefined,
      toLocation: form.toLocation || undefined,
      originSource: form.originSource || undefined,
    });
    showCreate.value = false;
    // The movement just changed this party's remainder, so drop the cached figure
    // and clear the party: the next pick refetches instead of reusing a stale one.
    // Operation, pile and the places stay filled for quick repeated entry.
    if (movedBatchId) delete batchInfoCache[movedBatchId];
    form.batchId = "";
    form.volume = null;
    volumeHint.value = "";
    await first();
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
  void loadOptions();
  void loadDict();
});
</script>

<template>
  <div>
    <div class="toolbar">
      <h1>Движение продукции</h1>
      <button @click="showCreate = true">Создать движение +</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Уникальный номер партии</th>
              <th>Штабель</th>
              <th>Операция</th>
              <th>Объем, т</th>
              <th>Откуда</th>
              <th>Куда</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in rows" :key="m.id">
              <td>{{ m.batchNumber || "—" }}</td>
              <td>{{ m.pileNumber || "—" }}</td>
              <td>{{ operationLabels[m.operation] }}</td>
              <td>{{ fmt(m.volume) }}</td>
              <td>{{ m.fromLocation || "—" }}</td>
              <td>{{ m.toLocation || "—" }}</td>
              <td>{{ fmtDate(m.createdAt) }}</td>
              <td>
                <div class="flex gap-2 items-center">
                  <button class="secondary" @click="qrTarget = m">
                    QR-Code
                  </button>
                  <button class="danger" @click="openDelete(m)">Удалить</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="muted">Движений пока нет</td>
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
      v-if="qrTarget"
      :title="`QR-код движения${qrTarget.batchNumber ? ' · ' + qrTarget.batchNumber : ''}`"
      @close="qrTarget = null"
      class="flex"
    >
      <div class="flex flex-col items-center">
        <div class="qr-box">
          <img
            :src="qrImageUrl('movement', qrTarget.id)"
            alt="QR-код"
            width="320"
            height="320"
          />
          <p>
            <RouterLink
              :to="`/qr/movement/${qrTarget.id}`"
              class="btn secondary"
            >
              Открыть страницу
            </RouterLink>
          </p>
        </div>
        <div class="actions">
          <button class="secondary" @click="qrTarget = null">Закрыть</button>
        </div>
      </div>
    </Modal>

    <Modal v-if="showCreate" title="Новое движение" @close="showCreate = false">
      <div class="form-grid">
        <label>
          Партия
          <select v-model="form.batchId">
            <option value="">Не указана</option>
            <option v-for="o in batchOptions" :key="o.id" :value="o.id">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label>
          Штабель
          <select v-model="form.pileId">
            <option value="">Не указана</option>
            <option v-for="o in pileOptions" :key="o.id" :value="o.id">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label>
          Операция
          <select v-model="form.operation">
            <!-- Product lifecycle: создание → перемещение → анализ → переработка
                 → смешение → резервирование → отгрузка -->
            <option value="PILE_CREATED">Создание штабеля</option>
            <option value="PILE_TRANSFERRED">Трансфер</option>
            <option value="ANALYSIS">Анализ</option>
            <option value="PROCESSING">Переработка</option>
            <option value="BLENDING">Смешение</option>
            <option value="RESERVATION">Резервирование</option>
            <option value="SHIPMENT">Отгрузка</option>
            <!-- Штабельные операции -->
            <option value="PILE_MERGED">Слияние штабелей</option>
            <option value="PILE_SPLIT">Разделение штабеля</option>
          </select>
        </label>
        <label>
          Объем, т
          <DecimalInput v-model="form.volume" />
        </label>
        <label>
          Откуда
          <AutocompleteInput
            v-model="form.fromLocation"
            :options="locationWords"
            :busy="addingLocation === 'from'"
            @add-new="addLocation('from', $event)"
          />
        </label>
        <label>
          Куда
          <AutocompleteInput
            v-model="form.toLocation"
            :options="locationWords"
            :busy="addingLocation === 'to'"
            @add-new="addLocation('to', $event)"
          />
        </label>
        <label class="full">
          Источник происхождения
          <input v-model="form.originSource" />
        </label>
      </div>
      <p class="muted">{{ operationEffects[form.operation] }}</p>
      <p v-if="volumeHint" class="muted">{{ volumeHint }}</p>
      <p v-else class="muted">
        Объем подставляется автоматически из доступного объема партии; при смене
        партии, штабеля или операции значение пересчитывается.
      </p>
      <div class="actions">
        <button class="secondary" @click="showCreate = false">Отмена</button>
        <button :disabled="saving" @click="submit">Добавить</button>
      </div>
    </Modal>

    <ConfirmDeleteModal
      v-if="deleteTarget"
      :title="`Удаление движения · ${operationLabels[deleteTarget.operation]}`"
      :confirm-label="deleteTarget.operation"
      :confirm-prompt="`Введите код операции «${deleteTarget.operation}» для подтверждения`"
      :busy="deleting"
      warning="Движение будет удалено безвозвратно. Если оно меняло объёмы партии и штабеля, они будут возвращены обратно. Удалённый приём партии в штабель возвращает объём в остаток партии."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
