<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

const props = defineProps<{ modelValue: string; placeholder?: string }>();
const emit = defineEmits<{ "update:modelValue": [string] }>();

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const dropUp = ref(false);
const viewYear = ref(0);
const viewMonth = ref(0);

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const selected = computed(() => parse(props.modelValue));

// dd/mm/yyyy HH:mm, as the passport forms print it everywhere else.
const display = computed(() => {
  const d = selected.value;
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
});

const hourValue = computed(() => pad(selected.value?.getHours() ?? 0));
const minuteValue = computed(() => pad(selected.value?.getMinutes() ?? 0));

const leadingBlanks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  return (first.getDay() + 6) % 7;
});

const daysInMonth = computed(() =>
  new Date(viewYear.value, viewMonth.value + 1, 0).getDate(),
);

function isToday(day: number): boolean {
  const now = new Date();
  return (
    day === now.getDate() &&
    viewMonth.value === now.getMonth() &&
    viewYear.value === now.getFullYear()
  );
}

function isSelectedDay(day: number): boolean {
  const d = selected.value;
  return (
    !!d &&
    day === d.getDate() &&
    viewMonth.value === d.getMonth() &&
    viewYear.value === d.getFullYear()
  );
}

function toLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function toggle() {
  if (!open.value) {
    const base = selected.value ?? new Date();
    viewYear.value = base.getFullYear();
    viewMonth.value = base.getMonth();
    // The popover is ~340px tall; flip above the field when it would not fit below.
    const rect = root.value?.getBoundingClientRect();
    dropUp.value = !!rect && window.innerHeight - rect.bottom < 340;
    open.value = true;
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
  } else {
    close();
  }
}

function close() {
  open.value = false;
  document.removeEventListener("mousedown", onOutside);
  document.removeEventListener("keydown", onKey);
}

function onOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    // Consume it: Modal listens on window and would otherwise close too.
    e.stopPropagation();
    close();
  }
}

onBeforeUnmount(close);

function shiftMonth(delta: number) {
  const next = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = next.getFullYear();
  viewMonth.value = next.getMonth();
}

function pickDay(day: number) {
  const base = selected.value ?? new Date();
  base.setFullYear(viewYear.value, viewMonth.value, day);
  emit("update:modelValue", toLocalValue(base));
  close();
}

function setTime(hour: number, minute: number) {
  const base = selected.value ?? new Date();
  base.setHours(hour, minute, 0, 0);
  emit("update:modelValue", toLocalValue(base));
}

function onHour(e: Event) {
  setTime(Number((e.target as HTMLSelectElement).value), Number(minuteValue.value));
}

function onMinute(e: Event) {
  setTime(Number(hourValue.value), Number((e.target as HTMLSelectElement).value));
}

function pickNow() {
  emit("update:modelValue", toLocalValue(new Date()));
  close();
}

function clear() {
  emit("update:modelValue", "");
  close();
}
</script>

<template>
  <div ref="root" class="datepicker">
    <button
      type="button"
      class="datepicker-field"
      :class="{ empty: !display }"
      @click="toggle"
    >
      <span>{{ display || placeholder || "дд/мм/гггг чч:мм" }}</span>
      <svg viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </button>

    <div v-if="open" class="datepicker-pop" :class="{ up: dropUp }">
      <div class="datepicker-head">
        <button type="button" class="secondary btn-sm" @click="shiftMonth(-1)">
          ←
        </button>
        <span>{{ MONTHS[viewMonth] }} {{ viewYear }}</span>
        <button type="button" class="secondary btn-sm" @click="shiftMonth(1)">
          →
        </button>
      </div>

      <div class="datepicker-week">
        <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
      </div>
      <div class="datepicker-grid">
        <span v-for="blank in leadingBlanks" :key="'blank-' + blank" />
        <button
          v-for="day in daysInMonth"
          :key="day"
          type="button"
          :class="{ today: isToday(day), selected: isSelectedDay(day) }"
          @click="pickDay(day)"
        >
          {{ day }}
        </button>
      </div>

      <div class="datepicker-time">
        <select :value="hourValue" @change="onHour">
          <option v-for="h in 24" :key="h - 1" :value="pad(h - 1)">
            {{ pad(h - 1) }}
          </option>
        </select>
        <span>:</span>
        <select :value="minuteValue" @change="onMinute">
          <option v-for="m in 60" :key="m - 1" :value="pad(m - 1)">
            {{ pad(m - 1) }}
          </option>
        </select>
      </div>

      <div class="datepicker-actions">
        <button
          v-if="modelValue"
          type="button"
          class="secondary btn-sm"
          @click="clear"
        >
          Очистить
        </button>
        <span v-else />
        <button type="button" class="secondary btn-sm" @click="pickNow">
          Сейчас
        </button>
      </div>
    </div>
  </div>
</template>
