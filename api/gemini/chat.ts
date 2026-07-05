import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

// Lazy-initialized Gemini AI client (kept warm across invocations on the same instance)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aleef-vercel" } },
    });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, history } = req.body || {};
    if (!message) {
      res.status(400).json({ error: "الرجاء إدخال نص الرسالة." });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      const mockResponses = [
        "مرحباً بك! أنا مستشار أليف لمساعدتك في رعاية حيوانك الأليف. (الوضع التجريبي نشط: الرجاء تفعيل مفتاح GEMINI_API_KEY للحصول على إجابات ذكية حية).",
        "بالتأكيد! لتغذية القطط بشكل سليم في الصيف، يفضل تقديم المياه العذبة باستمرار وتجنب الأطعمة المكشوفة المعرضة للحرارة.",
        "أهلاً بك! بالنسبة لتطعيمات الكلاب في اليمن، يتوفر لقاح داء الكلب واللقاح الخماسي في معظم العيادات البيطرية بصنعاء وعدن.",
        "أهلاً! إذا كان طائرك يعاني من الخمول، تأكد من إبعاده عن التيارات الهوائية المباشرة ووفر له مكاناً دافئاً وهادئاً ونظيفاً.",
      ];
      res.json({ text: mockResponses[Math.floor(Math.random() * mockResponses.length)] });
      return;
    }

    const systemInstruction =
      "أنت 'مستشار أليف الذكي' (Aleef Smart Advisor)، خبير بيطري ومستشار رعاية الحيوانات الأليفة الافتراضي لمنصة 'أليف' في اليمن. " +
      "تتحدث بلغة عربية ودودة، سهلة، وواضحة. تقدم نصائح ممتازة وموثوقة حول تربية وتغذية وصحة الحيوانات الأليفة (القطط، الكلاب، الطيور، الأرانب، والأسماك). " +
      "يرجى توجيه المستخدمين دائماً لزيارة عيادة بيطرية محلية مرخصة في حال وجود حالات إسعافية أو أعراض مرضية شديدة. " +
      "اجعل نصائحك ملائمة للبيئة اليمنية والموارد المتاحة محلياً، مع الحفاظ على أسلوب مشجع وإيجابي للغاية.";

    const formattedContents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        formattedContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }
    formattedContents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: { systemInstruction, temperature: 0.7 },
    });

    const replyText = response.text || "عذراً، لم أستطع توليد إجابة في الوقت الحالي. يرجى المحاولة مرة أخرى.";
    res.json({ text: replyText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "فشل في التواصل مع مستشار أليف الذكي. يرجى المحاولة لاحقاً." });
  }
}
