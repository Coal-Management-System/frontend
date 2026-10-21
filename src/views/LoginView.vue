<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { notifyError } from "@/composables/useToast";
import { errMsg } from "@/lib/format";

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const username = ref("");
const password = ref("");
const busy = ref(false);

async function submit() {
  if (!username.value.trim() || !password.value) {
    notifyError("Введите логин и пароль");
    return;
  }
  busy.value = true;
  try {
    await login(username.value.trim(), password.value);
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/dashboard";
    await router.push(redirect);
  } catch (e) {
    notifyError(errMsg(e));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="brand">
        <span class="brand-logo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 19h18L14.5 6.5l-3.4 6-2.3-3.4z" />
          </svg>
        </span>
        <span class="brand-text">
          <b>Coal Transport</b>
          <i>Уголь и качество</i>
        </span>
      </div>
      <h1>Вход в систему</h1>
      <label>
        Логин
        <input v-model="username" autocomplete="username" autofocus />
      </label>
      <label>
        Пароль
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>
      <button type="submit" :disabled="busy">Войти</button>
      <p class="muted">
        Учетные записи: admin, manager, user. Роль и смена подставляются в
        документы автоматически.
      </p>
    </form>
  </div>
</template>
