import { load } from "@tauri-apps/plugin-store";

const STORE_NAME = "gemini-settings.json";
const API_KEY_KEY = "gemini_api_key";

async function getStore() {
  return load(STORE_NAME, { autoSave: true });
}

export async function getGeminiApiKey(): Promise<string | null> {
  const store = await getStore();
  const key = await store.get<string>(API_KEY_KEY);
  return key ?? null;
}

export async function setGeminiApiKey(key: string): Promise<void> {
  const store = await getStore();
  await store.set(API_KEY_KEY, key);
  await store.save();
}

export async function removeGeminiApiKey(): Promise<void> {
  const store = await getStore();
  await store.delete(API_KEY_KEY);
  await store.save();
}

export async function hasGeminiApiKey(): Promise<boolean> {
  const key = await getGeminiApiKey();
  return key !== null && key.length > 0;
}
