<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { activityApi } from "@/api/coal";
import type { ActivityDto, ActivityFilter, ActivityKind } from "@/api/types";
import { activityKindLabels, fmtDate } from "@/lib/format";
import Pagination from "@/components/Pagination.vue";
import { usePagedList } from "@/composables/usePagedList";

// Admin-only journal: logins, opened pages, and every create / update / delete.
const filter = reactive<Required<ActivityFilter>>({
  username: "",
  kind: "",
  from: "",
  to: "",
});

const kindLabels = activityKindLabels;
const kinds = Object.keys(kindLabels) as ActivityKind[];

const {
  rows,
  loading,
  error,
  page,
  size,
  totalElements,
  totalPages,
  load,
  first,
  prev,
  next,
  setSize,
} = usePagedList<ActivityDto>(
  (q) =>
    activityApi.list({
      ...q,
      // Empty filter fields are left out, not sent as "".
      ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)),
    }),
  { size: 25 }
);

const users = ref<string[]>([]);

function resetFilter() {
  filter.username = "";
  filter.kind = "";
  filter.from = "";
  filter.to = "";
  void first();
}

onMounted(async () => {
  void load();
  try {
    users.value = await activityApi.users();
  } catch {
    // The list still works without the user dropdown options.
  }
});
</script>

<template>
  <div>
    <div class="toolbar">
      <h1>Журнал действий</h1>
    </div>

    <section class="panel mb-4">
      <div class="filters">
        <label class="field">
          <span>Пользователь</span>
          <select v-model="filter.username" @change="first">
            <option value="">Все</option>
            <option v-for="u in users" :key="u" :value="u">{{ u }}</option>
          </select>
        </label>
        <label class="field">
          <span>Тип действия</span>
          <select v-model="filter.kind" @change="first">
            <option value="">Все</option>
            <option v-for="k in kinds" :key="k" :value="k">
              {{ kindLabels[k] }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>С даты</span>
          <input v-model="filter.from" type="date" @change="first" />
        </label>
        <label class="field">
          <span>По дату</span>
          <input v-model="filter.to" type="date" @change="first" />
        </label>
        <button class="secondary self-end" @click="resetFilter">Сбросить</button>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <section class="panel">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Дата и время</th>
              <th>Пользователь</th>
              <th>Тип</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in rows" :key="a.id">
              <td class="whitespace-nowrap">{{ fmtDate(a.createdAt) }}</td>
              <td>
                <div>{{ a.fullName || a.username }}</div>
                <div v-if="a.fullName" class="muted text-xs">{{ a.username }}</div>
              </td>
              <td>
                <span class="kind" :class="a.kind.toLowerCase()">
                  {{ kindLabels[a.kind] }}
                </span>
              </td>
              <td>{{ a.summary }}</td>
            </tr>
            <tr v-if="!rows.length && !loading">
              <td colspan="4" class="muted">Записей нет</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination
        :page="page"
        :size="size"
        :total-pages="totalPages"
        :total-elements="totalElements"
        :loading="loading"
        :sizes="[25, 50, 100]"
        @prev="prev"
        @next="next"
        @update:size="setSize"
      />
    </section>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}
.filters .field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 170px;
}
</style>
