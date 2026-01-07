import { load } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { logger } from "@/lib/logger";

const SETTINGS_STORE_NAME = "settings.json";
const SHOW_DECEMBER_SNOW_FIELD = "show_december_snow";
const THEME_FIELD = "app_theme";

export type AppTheme = "light" | "dark" | "system";

interface AppSettingsState {
  showDecemberSnow: boolean;
  theme: AppTheme;
  isInitialLoadDone: boolean;

  // Actions
  setShowDecemberSnow: (show: boolean) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useAppSettingsStore = create<AppSettingsState>()((set, get) => ({
  showDecemberSnow: true,
  theme: "dark",
  isInitialLoadDone: false,

  setShowDecemberSnow: async (show: boolean) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        autoSave: true,
      });
      await store.set(SHOW_DECEMBER_SNOW_FIELD, show);
      await store.save();
      set({ showDecemberSnow: show });
    } catch (error) {
      logger.error(
        { err: error },
        "[Settings] Failed to save setting: showDecemberSnow"
      );
    }
  },

  setTheme: async (theme: AppTheme) => {
    try {
      const store = await load(SETTINGS_STORE_NAME, {
        autoSave: true,
      });
      await store.set(THEME_FIELD, theme);
      await store.save();
      set({ theme });

      // Update DOM immediately
      if (theme === "system") {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.toggle("dark", isDark);
      } else {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
    } catch (error) {
      logger.error({ err: error }, "[Settings] Failed to save setting: theme");
    }
  },

  loadSettings: async () => {
    try {
      logger.info("[Settings] Loading app settings...");
      const store = await load(SETTINGS_STORE_NAME, {
        autoSave: false,
      });
      const showSnow = await store.get<boolean>(SHOW_DECEMBER_SNOW_FIELD);
      const theme = await store.get<AppTheme>(THEME_FIELD);

      const finalTheme = theme ?? "dark";

      set({
        showDecemberSnow: showSnow ?? true,
        theme: finalTheme,
        isInitialLoadDone: true,
      });

      // Apply theme to DOM
      if (finalTheme === "system") {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.toggle("dark", isDark);
      } else {
        document.documentElement.classList.toggle(
          "dark",
          finalTheme === "dark"
        );
      }

      logger.info("[Settings] App settings loaded successfully");
    } catch (error) {
      logger.error({ err: error }, "[Settings] Failed to load settings");
      set({ isInitialLoadDone: true });
    }
  },
}));
