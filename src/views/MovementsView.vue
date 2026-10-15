<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { batchesApi, pilesApi, movementsApi, qrImageUrl } from "@/api/coal";
import type {
  BatchDto,
  PileDto,
  MovementCreateRequest,
  MovementDto,
} from "@/api/types";
import { errMsg, fmt, fmtDate, operationLabels } from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
import Modal from "@/components/Modal.vue";

const rows = ref<MovementDto[]>([]);
const batches = ref<BatchDto[]>([]);
const piles = ref<PileDto[]>([]);
const error = ref("");
const showCreate = ref(false);
const saving = ref(false);
const qrTarget = ref<MovementDto | null>(null);

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

async function load() {
  error.value = "";
  try {
    [rows.value, batches.value, piles.value] = await Promise.all([
      movementsApi.list(),
      batchesApi.list(),
      pilesApi.list(),
    ]);
  } catch (e) {
    error.value = errMsg(e);
  }
}

async function submit() {
  saving.value = true;
  error.value = "";
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
              <th>QR-Code</th>
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
                <button class="secondary" @click="qrTarget = m">
                  Показать
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="muted">Движений пока нет</td>
            </tr>
          </tbody>
        </table>
      </div>
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
              class="btn secondary text-black"
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
            <option v-for="b in batches" :key="b.id" :value="b.id">
              {{ b.batchNumber }}
            </option>
          </select>
        </label>
        <label>
          Штабель
          <select v-model="form.pileId">
            <option value="">Не указана</option>
            <option v-for="h in piles" :key="h.id" :value="h.id">
              {{ h.pileNumber }}
            </option>
          </select>
        </label>
        <label>
          Операция
          <select v-model="form.operation">
            <option value="PILE_CREATED">Создание штабеля</option>
            <option value="PILE_MERGED">Слияние штабелей</option>
            <option value="PILE_SPLIT">Разделение штабеля</option>
            <option value="PILE_TRANSFERRED">Трансфер</option>
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
  </div>
</template>
