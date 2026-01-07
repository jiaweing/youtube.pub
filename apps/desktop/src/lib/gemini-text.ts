import { GoogleGenAI } from "@google/genai";

export interface CarouselSlide {
  title: string;
  content: string;
  backgroundColor?: string;
  textColor?: string;
}

export async function generateCarouselContent(
  apiKey: string,
  topic: string,
  count: number,
  style: string
): Promise<CarouselSlide[]> {
  const ai = new GoogleGenAI({ apiKey });

  // Use a model that supports JSON mode effectively
  const model = "gemini-3-flash-preview";

  const prompt = `Generate a ${count}-slide social media carousel about "${topic}".
  Style/Tone: "${style}".
  
  Return a JSON array where each object represents a slide and has:
  - "title": Short, catchy headline (max 5 words).
  - "content": Body text (1-2 sentences).
  - "backgroundColor": specific hex color code matching the style (e.g., "#FDE68A").
  - "textColor": specific hex color code for high contrast (e.g., "#1F2937").
  
  Ensure the content flows logically from one slide to the next.
  Return ONLY the JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No text generated from Gemini");
    }

    // Parse JSON
    const slides = JSON.parse(text);
    if (!Array.isArray(slides)) {
      throw new Error("Gemini response is not an array");
    }
    return slides as CarouselSlide[];
  } catch (error) {
    console.error("Gemini text generation error:", error);
    throw error;
  }
}
