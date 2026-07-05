import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, AlertCircle, HelpCircle, User, Bot, Loader2 } from "lucide-react";
import { ChatMessage } from "../types";

const SUGGESTED_QUESTIONS = [
  "كيف أحمي قطتي من حر الصيف الشديد؟",
  "ما هي أهم التطعيمات للكلاب والقطط في اليمن؟",
  "ما الأطعمة المنزلية الآمنة لتقديمها لطيور الكوكوتيل؟",
  "كيف أتعامل مع قطة جديدة خائفة في المنزل؟",
];

export default function AiAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "مرحباً بك! أنا 'مستشار أليف الذكي'. أنا هنا للإجابة على جميع استفساراتك البيطرية ومساعدتك في رعاية وتغذية حيوانك الأليف بحب وأمان. ما الذي تود معرفته اليوم؟",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      // Package chat history for context (up to last 6 messages to keep tokens optimal)
      const formattedHistory = messages
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          history: formattedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("حدث خطأ أثناء الاتصال بمستشار أليف.");
      }

      const data = await response.json();
      
      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        text: data.text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setError("عذراً، واجهت مشكلة في الاتصال بالخادم. يرجى التأكد من تشغيل الخادم بشكل صحيح.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Container Card */}
      <div className="bg-white rounded-3xl border border-[#f3ede4] shadow-xl overflow-hidden flex flex-col h-[500px] sm:h-[650px]">
        
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-100 fill-current animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black flex items-center gap-1.5">
                مستشار أليف الذكي
                <span className="text-[10px] bg-white/30 text-white font-bold px-2 py-0.5 rounded-full">ذكاء اصطناعي</span>
              </h3>
              <p className="text-xs text-brand-100 font-medium mt-0.5">مساعدك الافتراضي المتخصص في رعاية وصحة الأليفين</p>
            </div>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-brand-50/20">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-[85%] ${
                msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-brand-700 border border-brand-100"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message bubble */}
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed font-semibold ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white rounded-tr-none"
                    : "bg-white text-gray-800 border border-[#f2eae0] rounded-tl-none shadow-xs"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Model Loading State */}
          {isLoading && (
            <div className="flex items-start gap-3 max-w-[85%] ml-auto">
              <div className="w-9 h-9 rounded-xl bg-white text-brand-700 border border-brand-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white text-gray-400 p-4 rounded-2xl rounded-tl-none border border-[#f2eae0] shadow-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                <span className="text-xs font-bold">يفكر مستشار أليف...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold max-w-md mx-auto">
              <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestions Tray if conversation just started */}
        {messages.length <= 2 && !isLoading && (
          <div className="p-4 bg-white border-t border-[#f4ede4] space-y-2">
            <span className="text-[11px] font-black text-gray-400 block mb-1">أسئلة مقترحة شائعة:</span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-100/50 rounded-xl text-xs font-bold text-right transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input Footer */}
        <div className="p-4 bg-white border-t border-[#f3ede4]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="اكتب سؤالك البيطري هنا (مثال: ماذا تأكل القطط الصغيرة؟)..."
              className="flex-grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl transition-all shadow-lg shadow-brand-600/10 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </form>
          <span className="block text-[10px] text-gray-400 font-bold text-center mt-2">
            ملاحظة: نصائح مستشار أليف إرشادية وتثقيفية، ولا تغني مطلقاً عن زيارة الطبيب البيطري المختص عند الضرورة.
          </span>
        </div>

      </div>
    </div>
  );
}
