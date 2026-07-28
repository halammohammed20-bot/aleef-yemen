import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in the environment. AI capabilities will run in mock mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for AI Pet Advisor (مستشار أليف الذكي)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "الرجاء إدخال نص الرسالة." });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Return a simulated, friendly response if the key is missing
      const mockResponses = [
        "مرحباً بك! أنا مستشار أليف لمساعدتك في رعاية حيوانك الأليف. (الوضع التجريبي نشط: الرجاء تفعيل مفتاح GEMINI_API_KEY للحصول على إجابات ذكية حية).",
        "بالتأكيد! لتغذية القطط بشكل سليم في الصيف، يفضل تقديم المياه العذبة باستمرار وتجنب الأطعمة المكشوفة المعرضة للحرارة.",
        "أهلاً بك! بالنسبة لتطعيمات الكلاب في اليمن، يتوفر لقاح داء الكلب واللقاح الخماسي في معظم العيادات البيطرية بصنعاء وعدن.",
        "أهلاً! إذا كان طائرك يعاني من الخمول، تأكد من إبعاده عن التيارات الهوائية المباشرة ووفر له مكاناً دافئاً وهادئاً ونظيفاً."
      ];
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      res.json({ text: randomResponse });
      return;
    }

    // Build Chat configuration with context and rules
    const systemInstruction = 
      "أنت 'مستشار أليف الذكي' (Aleef Smart Advisor)، مساعد رعاية حيوانات أليفة افتراضي لمنصة 'أليف' في اليمن، ولست طبيباً بيطرياً حقيقياً. " +
      "تتحدث بلغة عربية ودودة، سهلة، وواضحة. تقدم معلومات عامة موثوقة ومبنية على العلم حول تربية وتغذية وسلوك الحيوانات الأليفة (القطط، الكلاب، الطيور، الأرانب، والأسماك). " +
      "قواعد صارمة يجب اتباعها دائماً: " +
      "1) لا تشخّص حالات مرضية محددة ولا تصف أدوية أو جرعات علاجية أبداً؛ إن سُئلت عن ذلك وجّه صاحب السؤال فوراً وبوضوح لزيارة عيادة بيطرية مرخصة. " +
      "2) إذا كانت الأعراض الموصوفة تبدو خطيرة أو طارئة (نزيف، صعوبة تنفس، تسمم، إصابة شديدة)، ابدأ ردك بتنبيه واضح بضرورة التوجه فوراً لأقرب عيادة بيطرية أو طبيب مختص، قبل أي نصيحة أخرى. " +
      "3) لا تختلق معلومات أو أرقام أو أسماء عيادات أو أدوية لست متأكداً منها؛ إذا لم تكن متأكداً من إجابة دقيقة، قل ذلك بوضوح بدل التخمين. " +
      "4) اجعل نصائحك العامة (التغذية، السلوك، النظافة، الوقاية) ملائمة للبيئة اليمنية والموارد المتاحة محلياً، مع أسلوب مشجع وإيجابي. " +
      "5) ذكّر المستخدم بشكل طبيعي أن كلامك إرشادي عام ولا يغني عن الفحص الحقيقي عند أي حالة غير روتينية.";

    const formattedContents = [];
    
    // Add chat history if present
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        formattedContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      }
    }

    // Add current user message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    const replyText = response.text?.trim() || "عذراً، لم أستطع توليد إجابة واضحة لهذا السؤال. يرجى إعادة صياغته أو التواصل مع عيادة بيطرية مختصة لو كانت الحالة عاجلة.";
    res.json({ text: replyText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "فشل في التواصل مع مستشار أليف الذكي. يرجى المحاولة لاحقاً." });
  }
});

// Setup Vite Dev Server / Prod Static Assets routing
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
