<script setup lang="ts">
export type StatTone = "cyan" | "blue" | "violet" | "amber" | "green" | "red";

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    unit?: string;
    hint?: string;
    tone?: StatTone;
  }>(),
  { unit: "", hint: "", tone: "cyan" },
);

const toneDot: Record<StatTone, string> = {
  cyan: "bg-neon-cyan shadow-[0_0_8px_#22d3ee]",
  blue: "bg-neon-blue shadow-[0_0_8px_#60a5fa]",
  violet: "bg-neon-violet shadow-[0_0_8px_#a78bfa]",
  amber: "bg-neon-amber shadow-[0_0_8px_#fbbf24]",
  green: "bg-neon-green shadow-[0_0_8px_#34d399]",
  red: "bg-neon-red shadow-[0_0_8px_#fb7185]",
};

const toneGlow: Record<StatTone, string> = {
  cyan: "bg-[radial-gradient(closest-side,rgba(34,211,238,0.22),transparent)]",
  blue: "bg-[radial-gradient(closest-side,rgba(96,165,250,0.22),transparent)]",
  violet:
    "bg-[radial-gradient(closest-side,rgba(167,139,250,0.22),transparent)]",
  amber: "bg-[radial-gradient(closest-side,rgba(251,191,36,0.2),transparent)]",
  green: "bg-[radial-gradient(closest-side,rgba(52,211,153,0.2),transparent)]",
  red: "bg-[radial-gradient(closest-side,rgba(251,113,133,0.2),transparent)]",
};
</script>

<template>
  <div
    class="stat-card flex h-full flex-col min-h-(--card-h,auto) relative overflow-hidden rounded-panel border border-line bg-[linear-gradient(160deg,var(--glass-a),var(--glass-b))] p-4 shadow-panel"
  >
    <span
      :class="[
        'pointer-events-none absolute bottom-[-60%] right-[-30%] h-[90%] w-[70%]',
        toneGlow[tone],
      ]"
    ></span>
    <div class="flex items-center gap-2">
      <span :class="['size-1.5 shrink-0 rounded-full', toneDot[tone]]"></span>
      <span class="text-[0.78rem] text-mute">{{ label }}</span>
    </div>
    <div
      class="mt-2.5 text-[1.7rem] font-bold tracking-[0.01em] tabular-nums text-ink-bright"
    >
      {{ value
      }}<span v-if="unit" class="ml-1 text-sm font-semibold text-mute">{{
        unit
      }}</span>
    </div>
    <p v-if="hint" class="mt-1.5 text-xs text-mute-2">{{ hint }}</p>
  </div>
</template>
