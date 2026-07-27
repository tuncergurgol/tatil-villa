const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

type GeminiGenerateResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { message?: string; code?: number };
};

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export async function generateTextWithGemini(options: {
  systemInstruction?: string;
  prompt: string;
  jsonMode?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      ...(options.systemInstruction
        ? {
            systemInstruction: {
              parts: [{ text: options.systemInstruction }],
            },
          }
        : {}),
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 16384,
        ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      `[gemini] API hatası ${response.status}: ${detail.slice(0, 400)}`
    );
    return null;
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  if (data.error?.message) {
    console.error(`[gemini] ${data.error.message}`);
    return null;
  }

  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return text || null;
}
