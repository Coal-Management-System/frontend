<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useTheme } from "@/composables/useTheme";
import { notifyError } from "@/composables/useToast";
import { errMsg } from "@/lib/format";

const route = useRoute();
const router = useRouter();
const { login } = useAuth();
const { theme, toggle: toggleTheme } = useTheme();

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
      typeof route.query.redirect === "string"
        ? route.query.redirect
        : "/dashboard";
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
    <button
      class="ghost btn-sm theme-toggle login-theme-toggle"
      :title="theme === 'dark' ? 'Светлая тема' : 'Темная тема'"
      :aria-label="
        theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'
      "
      @click="toggleTheme"
    >
      <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3.5V2M12 22v-1.5M3.5 12H2M22 12h-1.5M5.6 5.6 4.5 4.5M19.5 19.5l-1.1-1.1M5.6 18.4l-1.1 1.1M19.5 4.5l-1.1 1.1M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
        />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5a8.5 8.5 0 1 0 11.3 11.3Z" />
      </svg>
    </button>
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
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
        />
      </label>
      <button type="submit" class="flex justify-center" :disabled="busy">
        Войти
      </button>
      <p class="muted">
        Учетные записи: admin, manager, user. Роль и смена подставляются в
        документы автоматически.
      </p>
    </form>
  </div>
</template>
