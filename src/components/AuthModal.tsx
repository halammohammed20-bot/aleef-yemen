import React, { useState } from "react";
import { X, Mail, Lock, User, Sparkles, AlertCircle, Eye, EyeOff } from "lucide-react";
import { UserAccount } from "../types";
import { supabase } from "../lib/supabaseClient";
import { fetchUserAccount } from "../lib/db";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  message?: string;
}

export default function AuthModal({ onClose, onLoginSuccess, message }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (oauthError) {
      setError(
        oauthError.message?.includes("provider is not enabled")
          ? "تسجيل الدخول بحساب Google غير مفعّل بعد من إعدادات المشروع. الرجاء تفعيله من Supabase أولاً."
          : oauthError.message
      );
      setGoogleLoading(false);
    }
    // عند النجاح، يعيد Supabase توجيه المستخدم تلقائياً، فلا حاجة لأي إجراء إضافي هنا
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!forgotEmail) {
      setError("الرجاء إدخال البريد الإلكتروني.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setError("الرجاء إدخال بريد إلكتروني صحيح.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail);
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(`تم إرسال رابط تعيين كلمة المرور إلى بريدك الإلكتروني: ${forgotEmail}. يرجى مراجعة بريدك الإلكتروني.`);
    setForgotEmail("");

    // In a short time, toggle back to login form
    setTimeout(() => {
      setIsForgotPassword(false);
      setError("");
      setSuccess("");
    }, 4500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password || (!isLogin && !username)) {
      setError("الرجاء ملء جميع الحقول المطلوبة.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("الرجاء إدخال بريد إلكتروني صحيح.");
      return;
    }

    if (password.length < 6) {
      setError("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
      return;
    }

    setLoading(true);

    if (isLogin) {
      // Login flow via Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        setLoading(false);
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        return;
      }

      const user = await fetchUserAccount(data.user.id, data.user.email || email);
      setLoading(false);
      setSuccess("تم تسجيل الدخول بنجاح! جاري الانتقال...");
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 800);
    } else {
      // Register flow via Supabase Auth (a matching "profiles" row is created automatically)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (signUpError) {
        setLoading(false);
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول."
            : signUpError.message
        );
        return;
      }

      if (!data.user) {
        setLoading(false);
        setError("حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى.");
        return;
      }

      // If email confirmations are enabled in Supabase, there will be no active session yet.
      if (!data.session) {
        setLoading(false);
        setSuccess("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.");
        return;
      }

      const newUser: UserAccount = {
        id: data.user.id,
        username,
        email: email.toLowerCase(),
        favoritePetIds: [],
        createdAt: new Date().toISOString(),
      };

      setLoading(false);
      setSuccess("تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...");
      setTimeout(() => {
        onLoginSuccess(newUser);
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-brand-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Top brand header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-brand-100 fill-current" />
          </div>

          <h3 className="text-xl font-black">مرحباً بك في منصة أليف</h3>
          <p className="text-xs text-brand-100 mt-1">
            سجل الآن لتتبع حيواناتك الأليفة وإضافتهم للمفضلة بسهولة
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {message && !error && !success && (
            <div className="flex items-start gap-2.5 p-3.5 bg-brand-50/80 text-brand-900 border border-brand-100 rounded-2xl text-xs font-bold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl text-xs font-bold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs font-bold leading-relaxed">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="text-right">
                <h4 className="text-sm font-black text-gray-800">استعادة كلمة المرور</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  أدخل بريدك الإلكتروني المسجل لإرسال رابط تعيين كلمة مرور جديدة فوراً.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">البريد الإلكتروني *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    style={{ direction: "ltr", textAlign: "right" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-600/10 active:scale-98 transition-all cursor-pointer mt-2"
              >
                إرسال رابط تعيين كلمة المرور
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-xs font-black text-gray-500 hover:text-brand-600 cursor-pointer"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tab Selection */}
              <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${
                    isLogin ? "bg-white text-brand-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${
                    !isLogin ? "bg-white text-brand-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  حساب جديد (تسجيل)
                </button>
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-black text-gray-700 shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mb-4"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                {googleLoading ? "جاري التوجيه..." : "المتابعة بحساب Google"}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="flex-1 h-px bg-gray-100"></span>
                <span className="text-[10px] font-black text-gray-400">أو بالبريد الإلكتروني</span>
                <span className="flex-1 h-px bg-gray-100"></span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username for registration */}
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">الاسم الكامل / المربي *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="مثال: أحمد اليماني"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">البريد الإلكتروني *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                      style={{ direction: "ltr", textAlign: "right" }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">كلمة المرور *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                      style={{ direction: "ltr", textAlign: "right" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password link */}
                {isLogin && (
                  <div className="text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError("");
                        setSuccess("");
                      }}
                      className="text-xs font-black text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                    >
                      نسيت كلمة المرور؟ 🤔
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-600/10 active:scale-98 transition-all cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "جاري المعالجة..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب والبدء"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
