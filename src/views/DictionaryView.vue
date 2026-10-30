<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { dictionaryApi } from "@/api/coal";
import type { DictionaryField, DictionaryMap } from "@/api/types";
import { errMsg } from "@/lib/format";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal.vue";
import { notifyError } from "@/composables/useToast";

const FIELDS: { key: DictionaryField; label: string }[] = [
  { key: "PRODUCT_TYPE", label: "Тип продукции" },
  { key: "COAL_GRADE", label: "Марка угля" },
  { key: "FRACTION", label: "Фракция" },
  { key: "QUARRY", label: "Карьер" },
  { key: "DEPOSIT", label: "Месторождение" },
  { key: "MINING_SITE", label: "Участок добычи" },
  { key: "SUPPLIER", label: "Поставщик" },
  { key: "METHOD", label: "Метод анализа" },
];

const dict = reactive<DictionaryMap>({
  PRODUCT_TYPE: [],
  COAL_GRADE: [],
  FRACTION: [],
  QUARRY: [],
  DEPOSIT: [],
  MINING_SITE: [],
  SUPPLIER: [],
  METHOD: [],
});
const loading = ref(true);
const error = ref("");
const drafts = reactive<Record<string, string>>({});
const adding = ref<DictionaryField | null>(null);

// Destructive delete of one vocabulary word; the word itself is the confirm text.
const deleteTarget = ref<{ field: DictionaryField; value: string } | null>(null);
const deleting = ref(false);

function openDelete(field: DictionaryField, value: string) {
  deleteTarget.value = { field, value };
}

async function confirmDelete(adminKey: string, text: string) {
  const target = deleteTarget.value;
  if (!target) return;
  deleting.value = true;
  try {
    await dictionaryApi.remove(target.field, target.value, adminKey, text);
    dict[target.field] = dict[target.field].filter(
      (w) => w.toLowerCase() !== target.value.toLowerCase(),
    );
    deleteTarget.value = null;
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    deleting.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    Object.assign(dict, await dictionaryApi.list());
  } catch (e) {
    error.value = errMsg(e);
  } finally {
    loading.value = false;
  }
}

async function add(field: DictionaryField) {
  const value = (drafts[field] ?? "").trim();
  if (!value) return;
  adding.value = field;
  try {
    await dictionaryApi.add(field, value);
    if (!dict[field].some((v) => v.toLowerCase() === value.toLowerCase())) {
      dict[field] = [...dict[field], value].sort((a, b) => a.localeCompare(b));
    }
    drafts[field] = "";
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    adding.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <h1>Словари</h1>
      <button class="secondary" @click="load">Обновить</button>
    </div>
    <p class="muted">
      Слова, которые подставляются при создании партии. Начните вводить слово в
      форме партии — совпадения появятся под полем, а новое слово можно добавить
      кнопкой.
    </p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="dict-grid">
      <section v-for="f in FIELDS" :key="f.key" class="panel dict-card">
        <div class="dict-head">
          <h2>{{ f.label }}</h2>
          <span class="dict-count">{{ dict[f.key].length }}</span>
        </div>

        <div class="dict-add">
          <input
            v-model="drafts[f.key]"
            placeholder="Новое слово…"
            @keydown.enter.prevent="add(f.key)"
          />
          <button
            :disabled="adding === f.key || !(drafts[f.key] ?? '').trim()"
            @click="add(f.key)"
          >
            Добавить
          </button>
        </div>

        <div v-if="dict[f.key].length" class="dict-tags">
          <span v-for="w in dict[f.key]" :key="w" class="dict-tag">
            {{ w }}
            <button
              type="button"
              class="dict-tag-del"
              title="Удалить слово"
              @click="openDelete(f.key, w)"
            >
              ×
            </button>
          </span>
        </div>
        <p v-else class="muted dict-empty">Пока нет слов</p>
      </section>
    </div>

    <ConfirmDeleteModal
      v-if="deleteTarget"
      :title="`Удаление слова «${deleteTarget.value}»`"
      :confirm-label="deleteTarget.value"
      :confirm-prompt="`Введите слово «${deleteTarget.value}» для подтверждения`"
      :busy="deleting"
      warning="Слово будет удалено из словаря безвозвратно. Уже созданные партии, использующие это слово, не изменяются."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped lang="scss">
.dict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.dict-card {
  padding: 1rem 1.1rem;
}
.dict-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.8rem;

  h2 {
    margin: 0;
    font-size: 1rem;
  }
}
.dict-count {
  min-width: 1.6rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--hover-wash);
  color: var(--color-mute);
  font-size: 0.75rem;
  text-align: center;
}
.dict-add {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.9rem;

  input {
    flex: 1;
    min-width: 0;
  }
  button {
    white-space: nowrap;
  }
}
.dict-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.dict-tag {
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--wash, transparent);
  color: var(--color-ink-soft);
  font-size: 0.8rem;
}
.dict-tag-del {
  margin-left: 0.35rem;
  padding: 0 0.15rem;
  border: none;
  background: transparent;
  color: var(--color-neon-red);
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  vertical-align: middle;
}
.dict-tag-del:hover {
  color: color-mix(in srgb, var(--color-neon-red) 70%, #fff);
}
.dict-empty {
  margin: 0;
  font-size: 0.82rem;
}
</style>
