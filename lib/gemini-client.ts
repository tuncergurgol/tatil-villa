const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

/** Yoğunluk / model kısıtında sırayla denenecek modeller. */
const GEMINI_MODEL_FALLBACKS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.0-flash-lite",
] as const;

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

function getGeminiModelCandidates() {
  const preferred = getGeminiModel();
  const ordered = [preferred, ...GEMINI_MODEL_FALLBACKS];
  return [...new Set(ordered)];
}

async function generateTextWithGeminiModel(
  model: string,
  apiKey: string,
  options: {
    systemInstruction?: string;
    prompt: string;
    jsonMode?: boolean;
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<{ text: string | null; retryable: boolean }> {
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
      `[gemini] ${model} hatası ${response.status}: ${detail.slice(0, 400)}`
    );
    const retryable = response.status === 429 || response.status === 503;
    return { text: null, retryable };
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  if (data.error?.message) {
    console.error(`[gemini] ${model}: ${data.error.message}`);
    return { text: null, retryable: true };
  }

  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return { text: text || null, retryable: false };
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

  for (const model of getGeminiModelCandidates()) {
    const result = await generateTextWithGeminiModel(model, apiKey, options);
    if (result.text) return result.text;
    if (!result.retryable) continue;
  }

  return null;
}
