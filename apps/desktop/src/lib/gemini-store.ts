import { invoke } from "@tauri-apps/api/core";
import { logger } from "@/lib/logger";

const GEMINI_API_KEY_KEY = "gemini_api_key";

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const key = await invoke<string | null>("secure_storage_retrieve", {
      key: GEMINI_API_KEY_KEY,
    });
    return key;
  } catch (error) {
    logger.error({ err: error }, "Failed to load Gemini API key");
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
    logger.error({ err: error }, "Failed to save Gemini API key");
    throw error;
  }
}

export async function removeGeminiApiKey(): Promise<void> {
  try {
    await invoke("secure_storage_remove_encrypted", {
      key: GEMINI_API_KEY_KEY,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to remove Gemini API key");
    throw error;
  }
}

export async function hasGeminiApiKey(): Promise<boolean> {
  try {
    return await invoke("secure_storage_exists", {
      key: GEMINI_API_KEY_KEY,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to check Gemini API key");
    return false;
  }
}
