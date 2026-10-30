<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { batchesApi, pilesApi, movementsApi, qrImageUrl } from "@/api/coal";
import type { MovementCreateRequest, MovementDto, OptionDto } from "@/api/types";
import { errMsg, fmt, fmtDate, operationLabels } from "@/lib/format";
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

async function submit() {
  saving.value = true;
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
          <input v-model="form.fromLocation" />
        </label>
        <label>
          Куда
          <input v-model="form.toLocation" />
        </label>
        <label class="full">
          Источник происхождения
          <input v-model="form.originSource" />
        </label>
      </div>
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
      warning="Движение будет удалено безвозвратно. Если это приём партии в штабель, удалённый объём вернётся в остаток партии."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
