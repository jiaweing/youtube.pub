// Web Worker for background removal
// This runs in a separate thread to prevent UI freezing
import { removeBackground } from "@imgly/background-removal";

self.onmessage = async (event: MessageEvent<{ imageData: string }>) => {
  try {
    const { imageData } = event.data;

    // Convert data URL to blob
    const response = await fetch(imageData);
    const blob = await response.blob();

    // Run background removal (this is CPU-intensive)
    const resultBlob = await removeBackground(blob);

    // Convert result back to data URL
    const reader = new FileReader();
    const resultDataUrl = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(resultBlob);
    });

    self.postMessage({ success: true, dataUrl: resultDataUrl });
  } catch (error) {
    self.postMessage({ success: false, error: String(error) });
  }
};
