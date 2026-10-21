<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { batchesApi, pilesApi, qrImageUrl } from "@/api/coal";
import type { OptionDto } from "@/api/types";
import { errMsg } from "@/lib/format";

const type = ref<"batch" | "pile">("batch");
const batchOptions = ref<OptionDto[]>([]);
const pileOptions = ref<OptionDto[]>([]);
const selected = ref("");
const error = ref("");

const options = computed(() =>
  type.value === "batch" ? batchOptions.value : pileOptions.value,
);

onMounted(async () => {
  try {
    [batchOptions.value, pileOptions.value] = await Promise.all([
      batchesApi.options(),
      pilesApi.options(),
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
          class="btn secondary"
          >Открыть страницу</RouterLink
        >
      </p>
    </div>
  </div>
</template>
