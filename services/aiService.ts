import { MovieScript, SceneFrame } from "../types";

// Types for OpenRouter/OpenAI API responses
// Types for OpenRouter/OpenAI API responses
interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
      // Start OpenRouter specific image response
      images?: {
        url?: string;
        b64_json?: string;
      }[];
      // End OpenRouter specific image response
    };
  }[];
}

interface ImageGenerationResponse {
  data: {
    b64_json?: string;
    url?: string;
  }[];
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

const getHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${apiKey}`,
  "HTTP-Referer": "https://seefactory.app", // Required by OpenRouter
  "X-Title": "SeeFactory"
});

export const generateMovieScript = async (
  apiKey: string,
  type: string,
  style: string,
  durationMinutes: number,
  content: string
): Promise<MovieScript> => {
  // ... (script generation remains same)
  if (!apiKey) throw new Error("API Key is missing.");

  // Handle fractional duration (e.g. 14s = 0.23m)
  // If duration is less than 1 minute, we generate fewer scenes.
  const isShortForm = durationMinutes < 1;
  const totalScenes = isShortForm ? 1 : Math.max(1, Math.round(durationMinutes * 4));

  const systemPrompt = `
    You are a professional movie director and screenwriter for SeeFactory.
    Output pure JSON.
  `;

  const userPrompt = `
    Task: Create a detailed movie script and storyboard breakdown.
    
    Parameters:
    - Genre: ${type}
    - Visual Style: ${style}
    - Duration: ${isShortForm ? '15 seconds' : durationMinutes + ' minutes'} (${totalScenes} scenes total)
    - Premise: ${content}

    Strict Requirements:
    1. Define a "Visual Context": A concise but highly descriptive paragraph defining the persistent look of the protagonist(s) and the primary environment.
    2. Break the movie down into exactly ${totalScenes} scenes.
    3. Output pure JSON matching the schema below.

    Output Schema:
    {
      "title": "string",
      "logline": "string",
      "visualContext": "string",
      "characters": ["string"],
      "acts": [{"title": "string", "content": "string"}],
      "scenes": [
        {
          "id": "string",
          "timeStart": "mm:ss",
          "timeEnd": "mm:ss",
          "description": "string",
          "cameraMovement": "string",
          "visualPrompt": "string (Focus on pose/action, do not repeat visualContext)"
        }
      ]
    }
  `;

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        model: "openai/gpt-5", // User specified model with standard prefix
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${err}`);
    }

    const data: ChatCompletionResponse = await response.json();
    const text = data.choices[0]?.message?.content;

    if (!text) throw new Error("No script generated.");

    return JSON.parse(text) as MovieScript;

  } catch (error) {
    console.error("Script Generation Error:", error);
    throw error;
  }
};

export const generateSceneImage = async (
  apiKey: string,
  visualContext: string,
  visualPrompt: string,
  style: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");

  const fullPrompt = `
    Generate an image based on this description.
    Movie Concept Art. Style: ${style}.
    Consistent Visuals: ${visualContext}
    Current Scene Action: ${visualPrompt}
    Cinematic composition, high detailed, 8k resolution.
    Return ONLY the base64 image data or URL.
  `.trim();

  try {
    // OpenRouter uses the chat/completions endpoint for image generation models too (multimodal output)
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        model: "openai/gpt-5-image", // User specified model with prefix
        messages: [
          { role: "user", content: fullPrompt }
        ],
        // OpenRouter specific: request image output
        // Note: Some models output markdown images, others raw URLs. 
        // We will parse for both.
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter Image API Error: ${response.status} - ${err}`);
    }

    const data: ChatCompletionResponse = await response.json();

    // 1. Check for explicit image array in choices[0].message (OpenRouter format for image models)
    if (data.choices?.[0]?.message?.images && data.choices[0].message.images.length > 0) {
      const img = data.choices[0].message.images[0];
      // Check for nested image_url object first (as seen in user log)
      // @ts-ignore - Dynamic key access for varied response shapes
      if (img.image_url?.url) return img.image_url.url;
      if (img.url) return img.url;
      if (img.b64_json) return `data:image/png;base64,${img.b64_json}`;
    }

    // 2. Check content for markdown/url/base64 (fallback)
    const content = data.choices?.[0]?.message?.content;


    if (content) {
      // Regex to find markdown image or raw URL
      const markdownMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1];
      }

      // Fallback: assume the entire content might be a URL if it starts with http
      if (content.trim().startsWith('http')) {
        return content.trim();
      }

      // Fallback: assume base64 if it starts with data:
      if (content.trim().startsWith('data:')) {
        return content.trim();
      }
    }

    // If we got here, we failed to find an image
    console.warn("Unexpected image response format:", data);
    throw new Error("AI did not return a recognizable image format. Check console for response.");

  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
