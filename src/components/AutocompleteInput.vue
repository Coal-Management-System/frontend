<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const model = defineModel<string | undefined>();
const props = withDefaults(
  defineProps<{
    options: string[];
    placeholder?: string;
    busy?: boolean;
    disabled?: boolean;
  }>(),
  { placeholder: "", busy: false, disabled: false },
);
const emit = defineEmits<{ (e: "add-new", value: string): void }>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const highlight = ref(-1);

const query = computed(() => (model.value ?? "").trim());

// Words that start with what's typed, case-insensitive; the whole list when empty.
const filtered = computed(() => {
  const q = query.value.toLowerCase();
  const all = props.options ?? [];
  const matched = q
    ? all.filter((o) => o.toLowerCase().startsWith(q))
    : all.slice();
  return matched.slice(0, 50);
});

const exactMatch = computed(() => {
  const q = query.value.toLowerCase();
  return q !== "" && (props.options ?? []).some((o) => o.toLowerCase() === q);
});

// Offer to add only when the typed word isn't already known.
const canAdd = computed(
  () =>
    query.value !== "" && !exactMatch.value && !props.busy && !props.disabled,
);

// The selectable rows: matching words, then the "add" row at the end.
const rowCount = computed(() => filtered.value.length + (canAdd.value ? 1 : 0));

function toggleDropdown(force?: boolean) {
  // A disabled field never opens its list, even if focus() is called on it.
  if (props.disabled) {
    open.value = false;
    return;
  }
  open.value = force ?? !open.value;
  if (open.value) highlight.value = -1;
}

function onInput(e: Event) {
  // Write the typed text back to the model so `query` (and the prefix filter)
  // reacts to every keystroke; without this the list would never narrow.
  model.value = (e.target as HTMLInputElement).value;
  open.value = true;
  highlight.value = -1;
}

function choose(value: string) {
  model.value = value;
  open.value = false;
  highlight.value = -1;
}

function addNew() {
  const value = query.value;
  if (!value) return;
  emit("add-new", value);
  open.value = false;
  highlight.value = -1;
}

function move(delta: number) {
  if (rowCount.value === 0) return;
  open.value = true;
  highlight.value = (highlight.value + delta + rowCount.value) % rowCount.value;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    move(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    move(-1);
  } else if (e.key === "Enter") {
    if (!open.value) return;
    e.preventDefault();
    if (highlight.value >= 0 && highlight.value < filtered.value.length) {
      choose(filtered.value[highlight.value]);
    } else if (highlight.value === filtered.value.length && canAdd.value) {
      addNew();
    }
  } else if (e.key === "Escape") {
    open.value = false;
    highlight.value = -1;
  }
}

function onDocumentClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false;
    highlight.value = -1;
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <div ref="root" class="ac">
    <input
      :value="model"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @input="onInput"
      @focus="toggleDropdown(true)"
      @keydown="onKeydown"
    />
    <div v-if="open && rowCount > 0" class="ac__pop">
      <button
        v-for="(opt, i) in filtered"
        :key="opt"
        type="button"
        class="ac__opt"
        :class="{ 'ac__opt--active': i === highlight }"
        @mousedown.prevent="choose(opt)"
        @mouseenter="highlight = i"
      >
        {{ opt }}
      </button>
      <button
        v-if="canAdd"
        type="button"
        class="ac__add"
        :class="{ 'ac__opt--active': highlight === filtered.length }"
        @mousedown.prevent="addNew"
        @mouseenter="highlight = filtered.length"
      >
        <span class="ac__plus">+</span> Добавить «{{ query }}»
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ac {
  position: relative;
  width: 100%;
}
.ac input {
  width: 100%;
  box-sizing: border-box;
}
.ac__pop {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 240px;
  overflow: auto;
  padding: 4px;
  border: 1px solid var(--color-line-strong);
  border-radius: 12px;
  background: var(--option-bg, var(--color-night));
  box-shadow: var(--shadow-panel);
}
.ac__opt,
.ac__add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-ink);
  font-family: inherit;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}
.ac__opt--active {
  background: var(--hover-wash);
}
.ac__add {
  color: var(--color-neon-cyan);
  border-top: 1px solid var(--color-line-faint);
  margin-top: 4px;
  padding-top: 0.55rem;
}
.ac__plus {
  font-weight: 700;
}
</style>
