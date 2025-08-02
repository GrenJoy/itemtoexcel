import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyD_bfv8pDgRFeCHkb663iTcounqJdwxIAE"
});

export async function analyzeInventoryImage(imageBase64: string): Promise<string[]> {
  try {
    const prompt = `
Твоя задача - точно скопировать названия предметов из списка на скриншоте из игры Warframe.

ПРАВИЛА:
1. Выписывай каждый предмет НА ОТДЕЛЬНОЙ СТРОКЕ.
2. Если строка начинается со слова "ЧЕРТЁЖ:", ОБЯЗАТЕЛЬНО в ответе удали слово "ЧЕРТЕЖ:" в начале но добавь - "(Чертеж)" в конце, например было ЧЕРТЕЖ: Лавос Прайм: Система, а станет Лавос Прайм: Система (Чертеж).
3. Не добавляй ничего от себя. Просто скопируй текст как можно точнее.

ПРИМЕР ОЖИДАЕМОГО ВЫВОДА:
Наутилус Прайм: Панцирь
Наутилус Прайм: Система
Севагот Прайм: Система (Чертеж)

Начинай копирование:
`;

    const contents = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },
      prompt,
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const itemsText = response.text || "";
    const items = itemsText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    return items;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to analyze image: ${error}`);
  }
}
