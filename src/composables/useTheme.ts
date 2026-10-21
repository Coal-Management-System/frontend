import { computed, reactive } from "vue";

export type ThemeName = "dark" | "light";

const STORAGE_KEY = "coal-theme";

function readStored(): ThemeName {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const state = reactive<{ theme: ThemeName }>({ theme: readStored() });

function apply(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
}

// Called from main.ts before the app mounts; index.html also sets the
// attribute inline so the very first paint never flashes the wrong theme.
export function initTheme() {
  apply(state.theme);
}

export function useTheme() {
  function toggle() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, state.theme);
    } catch {
      // Private browsing: the theme still applies for this page load.
    }
    apply(state.theme);
  }

  return { theme: computed(() => state.theme), toggle };
}
