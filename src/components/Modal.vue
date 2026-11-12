<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
const emit = defineEmits<{ close: [] }>();
// `wide` turns the dialog into a near-full-screen panel (e.g. for graphs).
defineProps<{ title: string; wide?: boolean }>();

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
    <div class="modal" :class="{ 'modal--wide': wide }">
      <h2>{{ title }}</h2>
      <slot />
    </div>
  </div>
</template>
