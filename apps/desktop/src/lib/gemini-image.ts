import { GoogleGenAI } from "@google/genai";

export type GeminiImageModel =
  | "gemini-3-pro-image-preview"
  | "gemini-2.5-flash-image";

export const GEMINI_IMAGE_MODELS: { value: GeminiImageModel; label: string }[] =
  [
    {
      value: "gemini-3-pro-image-preview",
      label: "Gemini 3 Pro Image",
    },
    {
      value: "gemini-2.5-flash-image",
      label: "Gemini 2.5 Flash Image",
    },
  ];

export interface GenerateImageResult {
  imageBase64: string;
  mimeType: string;
}

export async function generateImageWithGemini(
  apiKey: string,
  model: GeminiImageModel,
  prompt: string,
  inputImageBase64: string,
  inputMimeType = "image/png"
): Promise<GenerateImageResult> {
  const ai = new GoogleGenAI({ apiKey });

  // Remove data URL prefix if present to get raw base64
  const base64Data = inputImageBase64.includes(",")
    ? inputImageBase64.split(",")[1]
    : inputImageBase64;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: inputMimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  // Find the image part in the response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("No response parts received from Gemini API");
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? "image/png",
      };
    }
  }

  throw new Error("No image generated in response");
}

export function base64ToDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}
