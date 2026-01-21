
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = (): string => {
  // На Vercel ключ пробрасывается через vite.config.ts в process.env.API_KEY
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const MODEL_NAME = 'gemini-3-flash-preview';

export const isAiAvailable = (): boolean => {
  const key = getApiKey();
  return !!key && key.length > 10;
};

const createAiClient = () => {
  const key = getApiKey();
  if (!key) throw new Error("Ключ API не настроен в Vercel!");
  return new GoogleGenAI({ apiKey: key });
};

export const checkSpelling = async (text: string) => {
  const ai = createAiClient();
  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Ты корректор RBT.RU. Проверь: "${text}". Исправь ошибки. Верни JSON: {correctedText, errorsFound, explanation}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correctedText: { type: Type.STRING },
          errorsFound: { type: Type.BOOLEAN },
          explanation: { type: Type.STRING }
        },
        required: ["correctedText", "errorsFound", "explanation"]
      }
    }
  });
  return JSON.parse(result.text);
};

export const analyzeResponse = async (objection: string, response: string) => {
  const ai = createAiClient();
  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Разбери ответ на возражение "${objection}". Ответ: "${response}". Оцени по 10-бальной шкале. Верни JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          persuasiveness: { type: Type.NUMBER },
          politeness: { type: Type.NUMBER },
          logic: { type: Type.NUMBER },
          clientOrientation: { type: Type.NUMBER },
          satisfaction: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          score: { type: Type.NUMBER }
        },
        required: ["persuasiveness", "politeness", "logic", "clientOrientation", "satisfaction", "feedback", "score"]
      }
    }
  });
  return JSON.parse(result.text);
};

export const simulateClientStep = async (history: any[], mood: string, product: any) => {
  const ai = createAiClient();
  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts: history.flatMap(h => h.parts) },
    config: {
      systemInstruction: `Ты покупатель в RBT.RU. Товар: ${product.name}. Настроение: ${mood}. Будь реалистичным.`
    }
  });
  return result.text;
};
