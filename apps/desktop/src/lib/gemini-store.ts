import { invoke } from "@tauri-apps/api/core";

const GEMINI_API_KEY_KEY = "gemini_api_key";

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const key = await invoke<string | null>("secure_storage_retrieve", {
      key: GEMINI_API_KEY_KEY,
    });
    return key;
  } catch (error) {
    console.error("Failed to load Gemini API key:", error);
    return null;
  }
}

export async function setGeminiApiKey(apiKey: string): Promise<void> {
  try {
    if (!apiKey) {
      await removeGeminiApiKey();
      return;
    }

    await invoke("secure_storage_store", {
      key: GEMINI_API_KEY_KEY,
      value: apiKey,
    });
  } catch (error) {
    console.error("Failed to save Gemini API key:", error);
    throw error;
  }
}

export async function removeGeminiApiKey(): Promise<void> {
  try {
    await invoke("secure_storage_remove_encrypted", {
      key: GEMINI_API_KEY_KEY,
    });
  } catch (error) {
    console.error("Failed to remove Gemini API key:", error);
    throw error;
  }
}

export async function hasGeminiApiKey(): Promise<boolean> {
  try {
    return await invoke("secure_storage_exists", {
      key: GEMINI_API_KEY_KEY,
    });
  } catch (error) {
    console.error("Failed to check Gemini API key:", error);
    return false;
  }
}
