import { GoogleGenAI, Type } from "@google/genai";
import { MovieScript, SceneFrame } from "../types";

// Helper to get client with dynamic key
const getClient = (apiKey: string) => {
  if (!apiKey) throw new Error("API Key is missing. Please set it in Settings.");
  return new GoogleGenAI({ apiKey });
};

export const generateMovieScript = async (
  apiKey: string,
  type: string,
  style: string,
  durationMinutes: number,
  content: string
): Promise<MovieScript> => {
  const ai = getClient(apiKey);
  
  const totalScenes = durationMinutes * 4; // 1 scene per 15 seconds

  const prompt = `
    You are a professional movie director and screenwriter for SeeFactory.
    
    Task: Create a detailed movie script and storyboard breakdown.
    
    Parameters:
    - Genre: ${type}
    - Visual Style: ${style}
    - Duration: ${durationMinutes} minutes (${totalScenes} scenes total)
    - Premise: ${content}

    Strict Requirements:
    1. Define a "Visual Context": A concise but highly descriptive paragraph defining the persistent look of the protagonist(s) and the primary environment. This will be used to maintain consistency across AI image generation.
    2. Break the movie down into exactly ${totalScenes} scenes.
    3. Output pure JSON.

    Output Schema:
    - title (string)
    - logline (string)
    - visualContext (string: "Description of Main Character's appearance, clothing, and the specific lighting/environment style of the film.")
    - characters (array of strings)
    - acts (array of objects {title, content})
    - scenes (array of objects):
       - id (string)
       - timeStart (mm:ss)
       - timeEnd (mm:ss)
       - description (string)
       - cameraMovement (string)
       - visualPrompt (string: Specific action for this frame. Do NOT repeat the character description here, focus on the pose and action.)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          logline: { type: Type.STRING },
          visualContext: { type: Type.STRING },
          characters: { type: Type.ARRAY, items: { type: Type.STRING } },
          acts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                timeStart: { type: Type.STRING },
                timeEnd: { type: Type.STRING },
                description: { type: Type.STRING },
                cameraMovement: { type: Type.STRING },
                visualPrompt: { type: Type.STRING }
              }
            }
          }
        },
        required: ["title", "logline", "visualContext", "scenes", "characters"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No script generated.");
  
  // Clean potentially malformed JSON (remove markdown backticks)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(json)?|```$/g, '');
  }

  return JSON.parse(jsonStr) as MovieScript;
};

export const generateSceneImage = async (
  apiKey: string,
  visualContext: string,
  visualPrompt: string,
  style: string
): Promise<string> => {
  const ai = getClient(apiKey);

  // Construct a prompt that enforces consistency
  const enhancedPrompt = `
    Movie Concept Art. Style: ${style}.
    Consistent Visuals: ${visualContext}
    Current Scene Action: ${visualPrompt}
    Cinematic composition, high detailed, 8k resolution.
  `.trim();

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview", // Nano Banana Pro / High Quality
    contents: enhancedPrompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image generated.");
};