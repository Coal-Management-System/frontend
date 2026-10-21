<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  numbers: string[]
  ids: string[]
}>()

// Popover listing every party of one pile. Anchored with fixed positioning
// (viewport coords) and teleported to <body> so a table's overflow-x-auto
// wrapper never clips it.
const popover = ref<{ top: number; left: number } | null>(null)

function toggle(ev: MouseEvent) {
  if (popover.value) {
    popover.value = null
    return
  }
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  popover.value = { top: r.bottom + 6, left: r.left }
}

function close() {
  popover.value = null
}

onMounted(() => {
  // Outside click / scroll / resize dismiss the popover.
  document.addEventListener('click', close)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
})

onUnmounted(() => {
  document.removeEventListener('click', close)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <button
    v-if="props.numbers.length"
    class="batch-chip"
    :class="{ 'batch-chip--open': !!popover }"
    @click.stop="toggle"
  >
    <span class="batch-chip__label">{{ props.numbers[0] }}</span>
    <span v-if="props.numbers.length > 1" class="batch-chip__more">
      +{{ props.numbers.length - 1 }}
    </span>
    <svg class="batch-chip__caret" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>
  <span v-else class="muted">—</span>

  <Teleport to="body">
    <div
      v-if="popover"
      class="batch-popover"
      :style="{ top: popover.top + 'px', left: popover.left + 'px' }"
      @click.stop
    >
      <p class="batch-popover__title">Партии в штабеле</p>
      <ul class="batch-popover__list">
        <li v-for="(num, i) in props.numbers" :key="props.ids[i] ?? i">
          <RouterLink
            v-if="props.ids[i]"
            class="batch-popover__item"
            :to="`/batches/${props.ids[i]}`"
            @click="close"
          >
            {{ num }}
          </RouterLink>
          <span v-else class="batch-popover__item">{{ num }}</span>
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<style scoped>
.batch-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--secondary-bg);
  color: var(--color-ink);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.batch-chip:hover,
.batch-chip--open {
  background: var(--secondary-bg-hover);
  border-color: var(--color-neon-cyan);
  box-shadow: var(--secondary-hover-shadow);
}

.batch-chip__more {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent-wash);
  color: var(--color-neon-cyan);
  font-size: 0.75rem;
  font-weight: 700;
}

.batch-chip__caret {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.7;
}

.batch-popover {
  position: fixed;
  z-index: 60;
  min-width: 210px;
  max-width: 320px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--color-line);
  background: linear-gradient(160deg, var(--modal-a), var(--modal-b));
  box-shadow: var(--modal-shadow);
}

.batch-popover__title {
  margin: 0 0 8px;
  padding: 0 4px;
  color: var(--color-mute);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.batch-popover__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
}

.batch-popover__item {
  display: block;
  padding: 6px 10px;
  border-radius: 9px;
  color: var(--color-ink);
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.12s ease;
}

a.batch-popover__item:hover {
  background: var(--accent-wash);
  color: var(--color-neon-cyan);
}
</style>
