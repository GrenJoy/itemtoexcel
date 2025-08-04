import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyD_bfv8pDgRFeCHkb663iTcounqJdwxIAE"
});

export async function analyzeInventoryImage(imageBase64: string): Promise<{ name: string; quantity: number }[]> {
  try {
    const prompt = `
Твоя задача - точно скопировать названия предметов из списка на скриншоте из игры Warframe И УКАЗАТЬ их количество.

ПРАВИЛА:
1. Выписывай каждый предмет НА ОТДЕЛЬНОЙ СТРОКЕ в формате "Название предмета|Количество".
2. Если строка начинается со слова "ЧЕРТЁЖ:", ОБЯЗАТЕЛЬНО в ответе удали слово "ЧЕРТЕЖ:" в начале но добавь - "(Чертеж)" в конце.
3. КОЛИЧЕСТВО берешь из числа в кружочке в левом верхнем углу каждого предмета (например x2, x6, x3).
4. Если количество НЕ ВИДНО или отсутствует, ставь "1".
5. НЕ добавляй ничего от себя. Только название и количество через "|".

ПРИМЕР ОЖИДАЕМОГО ВЫВОДА:
Наутилус Прайм: Панцирь|1
Наутилус Прайм: Система|2
Севагот Прайм: Система (Чертеж)|6

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
      .filter(item => item.length > 0)
      .map(item => {
        const parts = item.split('|');
        const name = parts[0]?.trim() || '';
        const quantityStr = parts[1]?.trim() || '1';
        const quantity = parseInt(quantityStr) || 1;
        
        return { name, quantity };
      })
      .filter(item => item.name.length > 0);

    return items;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to analyze image: ${error}`);
  }
}
