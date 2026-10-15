<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { batchesApi, pilesApi, qrImageUrl } from "@/api/coal";
import type { BatchDto, PileDto } from "@/api/types";
import { errMsg } from "@/lib/format";

const type = ref<"batch" | "pile">("batch");
const batches = ref<BatchDto[]>([]);
const piles = ref<PileDto[]>([]);
const selected = ref("");
const error = ref("");

const options = computed(() =>
  type.value === "batch"
    ? batches.value.map((b) => ({ id: b.id, label: b.batchNumber }))
    : piles.value.map((h) => ({ id: h.id, label: h.pileNumber })),
);

onMounted(async () => {
  try {
    [batches.value, piles.value] = await Promise.all([
      batchesApi.list(),
      pilesApi.list(),
    ]);
  } catch (e) {
    error.value = errMsg(e);
  }
});
</script>

<template>
  <div>
    <h1>QR-кодирование</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="form-grid" style="max-width: 560px">
      <label>
        Тип объекта
        <select v-model="type" @change="selected = ''">
          <option value="batch">Партия</option>
          <option value="pile">Штабель</option>
        </select>
      </label>
      <label>
        Объект
        <select v-model="selected">
          <option value="" disabled>Выберите</option>
          <option v-for="o in options" :key="o.id" :value="o.id">
            {{ o.label }}
          </option>
        </select>
      </label>
    </div>
    <div v-if="selected" class="qr-box" style="margin-top: 1rem">
      <img
        :src="qrImageUrl(type, selected)"
        alt="QR-код"
        width="320"
        height="320"
      />
      <p>
        <RouterLink
          :to="`/qr/${type}/${selected}`"
          class="btn secondary text-black"
          >Открыть страницу</RouterLink
        >
      </p>
    </div>
  </div>
</template>
