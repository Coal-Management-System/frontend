<script setup lang="ts">
import { ref, watch } from "vue";

const model = defineModel<number | null>({ required: true });
const props = withDefaults(defineProps<{ decimals?: number }>(), {
  decimals: 2,
});

const text = ref(model.value?.toString() ?? "");

function toNumber(v: string): number | null {
  return v === "" || v === "." ? null : Number(v);
}

// keep the field in sync when the value is changed from outside (form reset, load)
watch(model, (v) => {
  if (v !== toNumber(text.value)) text.value = v?.toString() ?? "";
});

function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const v = el.value
    .replace(/,/g, ".") // allow comma as decimal separator
    .replace(/[^\d.]/g, "") // digits and dot only
    .replace(/(\..*)\./g, "$1") // single dot
    .replace(new RegExp(`^(\\d*\\.\\d{0,${props.decimals}}).*$`), "$1"); // max decimals
  el.value = v; // force the visible value
  text.value = v;
  model.value = toNumber(v);
}
</script>

<template>
  <input
    :value="text"
    type="text"
    inputmode="decimal"
    autocomplete="off"
    @input="onInput"
  />
</template>
