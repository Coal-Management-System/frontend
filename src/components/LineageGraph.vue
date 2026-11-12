<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { LineageEdgeDto, LineageNodeDto } from "@/api/types";

/**
 * Provenance graph of one pile: parties that fed into it, the piles those came from,
 * and the parties/piles it was split into. Material flows left to right — batch→pile
 * (accepted into) and pile→batch (split produced). The pile being viewed is highlighted.
 */
const props = defineProps<{
  nodes: LineageNodeDto[];
  edges: LineageEdgeDto[];
}>();

const NODE_W = 136;
const NODE_H = 46;
const COL_GAP = 92;
const ROW_GAP = 20;
const PAD = 18;
// Taller columns get truncated into an "…" marker, like the reference scheme.
const MAX_PER_COLUMN = 7;

interface LaidNode {
  id: string;
  type: "pile" | "batch";
  label: string;
  current: boolean;
  layer: number;
  x: number;
  y: number;
}

const layout = computed(() => {
  const nodes = props.nodes;
  const edges = props.edges;
  if (!nodes.length) return null;

  // --- layer assignment: BFS downstream (positive) and upstream (negative) from the current pile
  const outAdj = new Map<string, string[]>();
  const inAdj = new Map<string, string[]>();
  for (const e of edges) {
    if (!outAdj.has(e.from)) outAdj.set(e.from, []);
    outAdj.get(e.from)!.push(e.to);
    if (!inAdj.has(e.to)) inAdj.set(e.to, []);
    inAdj.get(e.to)!.push(e.from);
  }
  const start = nodes.find((n) => n.current) ?? nodes[0];
  const layer = new Map<string, number>();
  layer.set(start.id, 0);
  let frontier = [start.id];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const to of outAdj.get(id) ?? []) {
        if (!layer.has(to)) {
          layer.set(to, layer.get(id)! + 1);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  frontier = [start.id];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const from of inAdj.get(id) ?? []) {
        if (!layer.has(from)) {
          layer.set(from, layer.get(id)! - 1);
          next.push(from);
        }
      }
    }
    frontier = next;
  }

  // --- group into columns, truncate overflow, keep the backend (BFS) order inside a column
  const columns = new Map<number, LineageNodeDto[]>();
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0;
    if (!columns.has(l)) columns.set(l, []);
    columns.get(l)!.push(n);
  }
  const layers = [...columns.keys()].sort((a, b) => a - b);
  const visibleIds = new Set<string>();
  const truncated = new Set<number>();
  for (const l of layers) {
    const col = columns.get(l)!;
    col.slice(0, MAX_PER_COLUMN).forEach((n) => visibleIds.add(n.id));
    if (col.length > MAX_PER_COLUMN) truncated.add(l);
  }

  // --- positions: columns left to right, each vertically centered
  const minLayer = layers[0];
  const rowsOf = (l: number) =>
    Math.min(columns.get(l)!.length, MAX_PER_COLUMN) + (truncated.has(l) ? 1 : 0);
  const maxRows = Math.max(...layers.map(rowsOf));
  const rowStep = NODE_H + ROW_GAP;
  const totalH = maxRows * rowStep - ROW_GAP + PAD * 2;

  const laid: LaidNode[] = [];
  const ellipses: { id: string; x: number; y: number }[] = [];
  for (const l of layers) {
    const col = columns.get(l)!.filter((n) => visibleIds.has(n.id));
    const x = PAD + (l - minLayer) * (NODE_W + COL_GAP);
    const colH = rowsOf(l) * rowStep - ROW_GAP;
    const startY = PAD + (totalH - PAD * 2 - colH) / 2;
    col.forEach((n, i) => {
      laid.push({ ...n, layer: l, x, y: startY + i * rowStep });
    });
    if (truncated.has(l)) {
      ellipses.push({
        id: `dots-${l}`,
        x: x + NODE_W / 2,
        y: startY + col.length * rowStep + NODE_H / 2,
      });
    }
  }

  const pos = new Map(laid.map((n) => [n.id, n]));
  const paths = edges
    .filter((e) => pos.has(e.from) && pos.has(e.to))
    .map((e) => {
      const a = pos.get(e.from)!;
      const b = pos.get(e.to)!;
      const x1 = a.x + NODE_W;
      const y1 = a.y + NODE_H / 2;
      const x2 = b.x;
      const y2 = b.y + NODE_H / 2;
      const c = Math.max(40, Math.abs(x2 - x1) / 2);
      return {
        id: `${e.from}>${e.to}`,
        d: `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`,
      };
    });

  const width =
    PAD * 2 + (layers.length - 1) * (NODE_W + COL_GAP) + NODE_W;
  return { laid, ellipses, paths, width, height: totalH };
});

function typeCaption(n: { type: string }) {
  return n.type === "pile" ? "штабель" : "партия";
}

// The graph is usually wider than the modal, so bring the highlighted pile
// into view instead of leaving the user at the leftmost column.
const scrollBox = ref<HTMLElement | null>(null);

// Zoom the graph to fill its container (e.g. the full-screen history modal).
// Never shrink below natural size — a big graph scrolls instead — and cap the
// zoom so a two-node graph doesn't turn into giant boxes.
const MAX_ZOOM = 2;
const boxSize = ref({ w: 0, h: 0 });
const zoom = computed(() => {
  const l = layout.value;
  const { w, h } = boxSize.value;
  if (!l || !w || !h) return 1;
  const fit = Math.min((w - 10) / l.width, (h - 10) / l.height);
  return Math.max(1, Math.min(MAX_ZOOM, fit));
});

let observer: ResizeObserver | null = null;
function observe(box: HTMLElement | null) {
  observer?.disconnect();
  if (!box) return;
  observer = new ResizeObserver(() => {
    boxSize.value = { w: box.clientWidth, h: box.clientHeight };
  });
  observer.observe(box);
}
watch(scrollBox, observe);
onBeforeUnmount(() => observer?.disconnect());

function centerCurrent() {
  const box = scrollBox.value;
  const node = layout.value?.laid.find((n) => n.current);
  if (!box || !node) return;
  box.scrollLeft = (node.x + NODE_W / 2) * zoom.value - box.clientWidth / 2;
  box.scrollTop = (node.y + NODE_H / 2) * zoom.value - box.clientHeight / 2;
}
watch([layout, zoom], () => void nextTick(centerCurrent));
onMounted(() => {
  observe(scrollBox.value);
  centerCurrent();
});
</script>

<template>
  <div class="lineage-wrap">
    <div v-if="!layout" class="muted">Связей пока нет</div>
    <div v-else ref="scrollBox" class="lineage-scroll">
      <svg
        :width="layout.width * zoom"
        :height="layout.height * zoom"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        role="img"
        aria-label="Граф происхождения штабеля"
      >
        <defs>
          <marker
            id="lineage-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 z" class="arrow-head" />
          </marker>
        </defs>

        <path
          v-for="p in layout.paths"
          :key="p.id"
          :d="p.d"
          class="edge"
          marker-end="url(#lineage-arrow)"
        />

        <g v-for="n in layout.laid" :key="n.id">
          <rect
            :x="n.x"
            :y="n.y"
            :width="NODE_W"
            :height="NODE_H"
            rx="10"
            class="node"
            :class="[n.type, { current: n.current }]"
          />
          <text
            :x="n.x + NODE_W / 2"
            :y="n.y + 18"
            text-anchor="middle"
            class="node-caption"
            :class="{ current: n.current }"
          >
            {{ typeCaption(n) }}
          </text>
          <text
            :x="n.x + NODE_W / 2"
            :y="n.y + 35"
            text-anchor="middle"
            class="node-label"
            :class="{ current: n.current }"
          >
            {{ n.label }}
          </text>
        </g>

        <text
          v-for="d in layout.ellipses"
          :key="d.id"
          :x="d.x"
          :y="d.y"
          text-anchor="middle"
          class="dots"
        >
          …
        </text>
      </svg>
    </div>
    <div class="legend">
      <span class="legend-item"><i class="swatch current" /> текущий штабель</span>
      <span class="legend-item"><i class="swatch pile" /> штабель</span>
      <span class="legend-item"><i class="swatch batch" /> партия</span>
      <span class="legend-item muted">стрелка — движение угля</span>
    </div>
  </div>
</template>

<style scoped>
.lineage-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* Grows to fill the parent when the parent gives it height (wide modal). */
.lineage-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
  border: 1px solid var(--calm-border);
  border-radius: 12px;
  background: var(--calm-canvas);
  padding: 4px;
}
/* margin:auto centres a small graph but keeps a large one scrollable from its edge. */
.lineage-scroll > svg {
  flex: none;
  margin: auto;
}
.edge {
  fill: none;
  stroke: var(--calm-edge);
  stroke-width: 1.6;
}
.arrow-head {
  fill: var(--calm-arrow);
}
.node {
  stroke-width: 1.4;
}
.node.batch {
  fill: var(--calm-batch-fill);
  stroke: var(--calm-batch-stroke);
}
.node.pile {
  fill: var(--calm-pile-fill);
  stroke: var(--calm-pile-stroke);
}
.node.current {
  fill: var(--calm-current-fill);
  stroke: var(--calm-current-stroke);
}
.node-caption {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--calm-mute);
}
.node-label {
  font-size: 13px;
  font-weight: 600;
  fill: var(--calm-ink);
}
.node-caption.current,
.node-label.current {
  fill: var(--calm-current-ink);
}
.dots {
  font-size: 18px;
  font-weight: 700;
  fill: var(--calm-mute);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  font-size: 12px;
  color: var(--calm-mute);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
}
.swatch.batch {
  background: var(--calm-batch-fill);
  border: 1px solid var(--calm-batch-stroke);
}
.swatch.pile {
  background: var(--calm-pile-fill);
  border: 1px solid var(--calm-pile-stroke);
}
.swatch.current {
  background: var(--calm-current-fill);
  border: 1px solid var(--calm-current-stroke);
}
</style>
