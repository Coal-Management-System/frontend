<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section>
    <h2
      class="mb-3 text-[0.95rem] font-semibold tracking-[0.02em] text-ink-bright"
    >
      {{ title }}
    </h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <slot />
    </div>
  </section>
</template>
