<script setup lang="ts">
import { ref, watch } from "vue";
import Modal from "./Modal.vue";

// Two-step destructive confirm, matching the party-delete flow:
//   step 1 — a plain warning with «Продолжить»;
//   step 2 — type the target's name back + the admin key, then «Удалить навсегда».
// The parent owns the API call and closing; this component only gates the click.
const props = defineProps<{
  title: string;
  warning: string;
  /** Exact text the user must type back to enable the delete button. */
  confirmLabel: string;
  /** Human label for the type-back field, e.g. «Введите номер штабеля …». */
  confirmPrompt: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [adminKey: string, text: string];
}>();

const step = ref<1 | 2>(1);
const text = ref("");
const key = ref("");

// A new target reopens the dialog fresh: back to the warning, fields cleared.
watch(
  () => props.confirmLabel,
  () => {
    step.value = 1;
    text.value = "";
    key.value = "";
  },
);

function canDelete() {
  return key.value.length > 0 && text.value === props.confirmLabel;
}
</script>

<template>
  <Modal :title="title" @close="emit('close')">
    <template v-if="step === 1">
      <p>{{ warning }}</p>
      <div class="actions">
        <button class="secondary" @click="emit('close')">Отмена</button>
        <button class="danger" @click="step = 2">Продолжить</button>
      </div>
    </template>
    <template v-else>
      <div class="form-grid">
        <label class="full">
          {{ confirmPrompt }}
          <input v-model="text" autocomplete="off" />
        </label>
        <label class="full">
          Ключ администратора
          <input v-model="key" type="password" autocomplete="off" />
        </label>
      </div>
      <div class="actions">
        <button class="secondary" @click="emit('close')">Отмена</button>
        <button
          class="danger"
          :disabled="busy || !canDelete()"
          @click="emit('confirm', key, text)"
        >
          Удалить навсегда
        </button>
      </div>
    </template>
  </Modal>
</template>
