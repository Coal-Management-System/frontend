<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
const emit = defineEmits<{ close: [] }>();
defineProps<{ title: string }>();

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.stopPropagation();
    emit("close");
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ title }}</h2>
      <slot />
    </div>
  </div>
</template>
