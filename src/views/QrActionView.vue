<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { qrActionsApi } from "@/api/coal";
import type { QrActionScanDto } from "@/api/types";
import { errMsg, fmt } from "@/lib/format";
import DecimalInput from "@/components/DecimalInput.vue";
import { notifyError } from "@/composables/useToast";

const id = useRoute().params.id as string;

const scan = ref<QrActionScanDto | null>(null);
const error = ref("");
const pileId = ref("");
const volume = ref<number | null>(null);
const saving = ref(false);
const lastAccepted = ref("");

async function load() {
  scan.value = await qrActionsApi.scan(id);
  volume.value = scan.value.action.remainingVolume;
  pileId.value = "";
}

async function accept() {
  const pile = scan.value?.piles.find((p) => p.id === pileId.value);
  if (!pile || !volume.value) return;
  saving.value = true;
  try {
    await qrActionsApi.execute(id, { pileId: pile.id, volume: volume.value });
    lastAccepted.value = `${fmt(volume.value)} т принято в штабель ${pile.pileNumber}`;
    await load();
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = errMsg(e);
  }
});
</script>

<template>
  <main class="content" style="max-width: 560px; margin: 0 auto">
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else-if="scan">
      <h1>Принять партию {{ scan.action.batchNumber }}</h1>
      <p class="muted">
        Склад {{ scan.action.warehouseNumber }} · осталось принять
        {{ fmt(scan.action.remainingVolume) }} т
      </p>
      <p v-if="lastAccepted" class="muted">✓ {{ lastAccepted }}</p>

      <section v-if="scan.action.status === 'CANCELLED'" class="panel">
        Это QR-задание отменено.
      </section>
      <section v-else-if="scan.action.status === 'DONE'" class="panel">
        Партия принята полностью, задание выполнено.
      </section>
      <section v-else-if="!scan.piles.length" class="panel">
        На складе {{ scan.action.warehouseNumber }} нет штабелей. Создайте штабель
        на странице «Штабели» и отсканируйте код снова.
      </section>
      <template v-else>
        <h2>Выберите штабель</h2>
        <div class="flex flex-col gap-2 mb-4">
          <button
            v-for="p in scan.piles"
            :key="p.id"
            :class="{ secondary: pileId !== p.id }"
            style="width: 100%; text-align: left; padding: 0.9rem 1rem"
            @click="pileId = p.id"
          >
            {{ p.pileNumber }} · {{ fmt(p.volume) }} т
          </button>
        </div>
        <section class="panel">
          <div class="form-grid">
            <label class="full">
              Объем, т
              <DecimalInput v-model="volume" />
            </label>
          </div>
          <div class="actions">
            <button :disabled="saving || !pileId || !volume" @click="accept">
              Принять в штабель
            </button>
          </div>
        </section>
      </template>
    </template>
    <p v-else class="muted">Загрузка…</p>
  </main>
</template>
