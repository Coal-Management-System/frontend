<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { activityApi } from "@/api/coal";
import type { ActivityDto } from "@/api/types";
import { activityKindLabels, errMsg, fmtDate } from "@/lib/format";

// Latest entries of the admin activity journal, as a compact dashboard block.
const SIZES = [5, 10];
const size = ref(Number(localStorage.getItem("dash.activity.size")) || 5);
const rows = ref<ActivityDto[]>([]);
const loading = ref(false);
const error = ref("");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    rows.value = (await activityApi.list({ page: 0, size: size.value })).content;
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    loading.value = false;
  }
}

function setSize(n: number) {
  size.value = n;
  // Remembered per browser, so the admin's choice survives a reload.
  localStorage.setItem("dash.activity.size", String(n));
  void load();
}

onMounted(load);
</script>

<template>
  <section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="m-0 text-[0.95rem] font-semibold tracking-[0.02em] text-ink-bright">
        Последние действия пользователей
      </h2>
      <div class="flex items-center gap-2">
        <div class="size-seg">
          <button
            v-for="n in SIZES"
            :key="n"
            type="button"
            :class="{ active: size === n }"
            @click="setSize(n)"
          >
            {{ n }}
          </button>
        </div>
        <RouterLink to="/activity" class="btn secondary">Весь журнал</RouterLink>
      </div>
    </div>
    <div class="panel">
      <p v-if="error" class="error">{{ error }}</p>
      <div v-else class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Время</th>
              <th>Пользователь</th>
              <th>Тип</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in rows" :key="a.id">
              <td class="whitespace-nowrap">{{ fmtDate(a.createdAt) }}</td>
              <td>{{ a.fullName || a.username }}</td>
              <td>
                <span class="kind" :class="a.kind.toLowerCase()">
                  {{ activityKindLabels[a.kind] }}
                </span>
              </td>
              <td>{{ a.summary }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="4" class="muted">
                {{ loading ? "Загрузка…" : "Записей пока нет" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 5 / 10 rows switch. */
.size-seg {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--calm-border);
  border-radius: 10px;
  background: var(--calm-seg-bg);
}
.size-seg button {
  border: none;
  background: transparent;
  box-shadow: none;
  color: var(--calm-mute);
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.size-seg button.active {
  background: var(--calm-seg-active);
  color: var(--calm-ink);
}
</style>
