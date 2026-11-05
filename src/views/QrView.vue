<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  batchesApi,
  pilesApi,
  qrActionsApi,
  qrImageUrl,
  warehousesApi,
} from "@/api/coal";
import type { OptionDto, QrActionDto, QrActionStatus } from "@/api/types";
import { errMsg, fmt, fmtDate } from "@/lib/format";
import Pagination from "@/components/Pagination.vue";
import { usePagedList } from "@/composables/usePagedList";
import { notifyError } from "@/composables/useToast";

const mode = ref<"action" | "passport">("action");

const {
  rows: actions,
  loading,
  page,
  size,
  totalElements,
  totalPages,
  load,
  prev,
  next,
  setSize,
} = usePagedList<QrActionDto>(qrActionsApi.list);

const availableBatches = ref<OptionDto[]>([]);
const warehouses = ref<OptionDto[]>([]);
const form = reactive({ batchId: "", warehouseId: "" });
const saving = ref(false);
const created = ref<QrActionDto | null>(null);

const statusLabels: Record<QrActionStatus, string> = {
  OPEN: "Ожидает",
  DONE: "Выполнено",
  CANCELLED: "Отменено",
};

async function createAction() {
  saving.value = true;
  try {
    created.value = await qrActionsApi.create({
      action: "ACCEPT_BATCH_INTO_PILE",
      batchId: form.batchId,
      warehouseId: form.warehouseId,
    });
    await load();
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

async function cancelAction(a: QrActionDto) {
  try {
    await qrActionsApi.cancel(a.id);
    if (created.value?.id === a.id) created.value = null;
    await load();
  } catch (e) {
    notifyError(errMsg(e));
  }
}

// Read-only passport codes, as before.
const passportType = ref<"batch" | "pile">("batch");
const batchOptions = ref<OptionDto[]>([]);
const pileOptions = ref<OptionDto[]>([]);
const passportId = ref("");
const passportOptions = computed(() =>
  passportType.value === "batch" ? batchOptions.value : pileOptions.value,
);

onMounted(async () => {
  void load();
  try {
    [availableBatches.value, warehouses.value, batchOptions.value, pileOptions.value] =
      await Promise.all([
        batchesApi.options(true),
        warehousesApi.options(),
        batchesApi.options(),
        pilesApi.options(),
      ]);
  } catch (e) {
    notifyError(errMsg(e));
  }
});
</script>

<template>
  <div>
    <h1>QR-кодирование</h1>
    <div class="flex gap-2 mb-4">
      <button
        :class="{ secondary: mode !== 'action' }"
        @click="mode = 'action'"
      >
        QR-задание
      </button>
      <button
        :class="{ secondary: mode !== 'passport' }"
        @click="mode = 'passport'"
      >
        QR-паспорт
      </button>
    </div>

    <template v-if="mode === 'action'">
      <section class="panel">
        <div class="form-grid">
          <label class="full">
            Действие
            <select disabled>
              <option>Принять партию в штабель</option>
            </select>
          </label>
          <label>
            Партия
            <select v-model="form.batchId">
              <option value="" disabled>Выберите</option>
              <option v-for="o in availableBatches" :key="o.id" :value="o.id">
                {{ o.label }}
              </option>
            </select>
          </label>
          <label>
            Склад приёма
            <select v-model="form.warehouseId">
              <option value="" disabled>Выберите</option>
              <option v-for="o in warehouses" :key="o.id" :value="o.id">
                {{ o.label }}
              </option>
            </select>
          </label>
        </div>
        <p class="muted">
          Оператор сканирует код, входит в систему, выбирает штабель этого склада
          и подтверждает объем. Код работает, пока партия не принята полностью.
        </p>
        <div class="actions">
          <button
            :disabled="saving || !form.batchId || !form.warehouseId"
            @click="createAction"
          >
            Создать QR-код
          </button>
        </div>
      </section>

      <div v-if="created" class="qr-box" style="margin-top: 1rem">
        <img
          :src="qrImageUrl('action', created.id)"
          alt="QR-код"
          width="320"
          height="320"
        />
        <p>
          Принять {{ created.batchNumber }} · склад {{ created.warehouseNumber }}
        </p>
        <p>
          <RouterLink :to="`/qr/action/${created.id}`" class="btn secondary">
            Открыть страницу
          </RouterLink>
        </p>
      </div>

      <section class="panel" style="margin-top: 1rem">
        <h2>QR-задания</h2>
        <div class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Партия</th>
                <th>Склад</th>
                <th>Осталось принять, т</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in actions" :key="a.id">
                <td>{{ a.batchNumber }}</td>
                <td>{{ a.warehouseNumber }}</td>
                <td>{{ fmt(a.remainingVolume) }}</td>
                <td>{{ statusLabels[a.status] }}</td>
                <td>{{ fmtDate(a.createdAt) }}</td>
                <td>
                  <div class="flex gap-2 items-center">
                    <button
                      v-if="a.status === 'OPEN'"
                      class="secondary"
                      @click="created = a"
                    >
                      QR-код
                    </button>
                    <button
                      v-if="a.status === 'OPEN'"
                      class="danger"
                      @click="cancelAction(a)"
                    >
                      Отменить
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!actions.length">
                <td colspan="6" class="muted">QR-заданий пока нет</td>
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
    </template>

    <template v-else>
      <div class="form-grid" style="max-width: 560px">
        <label>
          Тип объекта
          <select v-model="passportType" @change="passportId = ''">
            <option value="batch">Партия</option>
            <option value="pile">Штабель</option>
          </select>
        </label>
        <label>
          Объект
          <select v-model="passportId">
            <option value="" disabled>Выберите</option>
            <option v-for="o in passportOptions" :key="o.id" :value="o.id">
              {{ o.label }}
            </option>
          </select>
        </label>
      </div>
      <div v-if="passportId" class="qr-box" style="margin-top: 1rem">
        <img
          :src="qrImageUrl(passportType, passportId)"
          alt="QR-код"
          width="320"
          height="320"
        />
        <p>
          <RouterLink
            :to="`/qr/${passportType}/${passportId}`"
            class="btn secondary"
          >
            Открыть страницу
          </RouterLink>
        </p>
      </div>
    </template>
  </div>
</template>
