<script setup lang="ts">
import { computed } from "vue";
import { pluralRu } from "@/lib/format";

const props = withDefaults(
  defineProps<{
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    loading?: boolean;
    sizes?: number[];
  }>(),
  { loading: false, sizes: () => [10, 25, 50] }
);

const emit = defineEmits<{ prev: []; next: []; "update:size": [number] }>();

const shownPages = computed(() => Math.max(1, props.totalPages));

function onSize(e: Event) {
  emit("update:size", Number((e.target as HTMLSelectElement).value));
}
</script>

<template>
  <div class="pagination">
    <span class="muted">
      Страница {{ page + 1 }} из {{ shownPages }} · {{ totalElements }}
      {{ pluralRu(totalElements, ["запись", "записи", "записей"]) }}
    </span>
    <div class="pagination-controls">
      <label class="muted">
        По
        <select :value="size" :disabled="loading" @change="onSize">
          <option v-for="option in sizes" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
      <button type="button" class="secondary btn-sm" :disabled="loading || page <= 0" @click="emit('prev')">
        ← Назад
      </button>
      <button
        type="button"
        class="secondary btn-sm"
        :disabled="loading || page >= totalPages - 1"
        @click="emit('next')"
      >
        Вперед →
      </button>
    </div>
  </div>
</template>
