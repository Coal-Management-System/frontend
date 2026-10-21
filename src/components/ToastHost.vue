<script setup lang="ts">
import { dismissToast, useToasts } from "@/composables/useToast";

const { toasts } = useToasts();
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" aria-live="assertive">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.kind"
          role="alert"
          @click="dismissToast(t.id)"
        >
          <span class="toast-mark" aria-hidden="true">
            {{ t.kind === "error" ? "!" : "✓" }}
          </span>
          <span class="toast-text">{{ t.text }}</span>
          <button
            class="toast-x"
            aria-label="Закрыть"
            @click.stop="dismissToast(t.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
