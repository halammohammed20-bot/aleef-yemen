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
      "أنت 'مستشار أليف الذكي' (Aleef Smart Advisor)، خبير بيطري ومستشار رعاية الحيوانات الأليفة الافتراضي لمنصة 'أليف' في اليمن. " +
      "تتحدث بلغة عربية ودودة، سهلة، وواضحة. تقدم نصائح ممتازة وموثوقة حول تربية وتغذية وصحة الحيوانات الأليفة (القطط، الكلاب، الطيور، الأرانب، والأسماك). " +
      "يرجى توجيه المستخدمين دائماً لزيارة عيادة بيطرية محلية مرخصة في حال وجود حالات إسعافية أو أعراض مرضية شديدة. " +
      "اجعل نصائحك ملائمة للبيئة اليمنية والموارد المتاحة محلياً، مع الحفاظ على أسلوب مشجع وإيجابي للغاية.";

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
        temperature: 0.7,
      },
    });

    const replyText = response.text || "عذراً، لم أستطع توليد إجابة في الوقت الحالي. يرجى المحاولة مرة أخرى.";
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
