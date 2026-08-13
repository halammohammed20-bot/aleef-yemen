import React, { useState } from "react";
import { BookOpen, Heart, MessageSquare, Plus, PenTool, Sparkles, Send, Loader2 } from "lucide-react";
import { CommunityPost, PostComment, UserAccount } from "../types";
import { fetchPostComments, insertPostComment } from "../lib/db";

interface CommunityHubProps {
  posts: CommunityPost[];
  onAddPost: (post: Omit<CommunityPost, "id" | "likes" | "commentsCount" | "createdAt">) => void;
  onLikePost: (id: string) => void;
  currentUser: UserAccount | null;
  onRequireAuth: (message: string) => void;
}

export default function CommunityHub({ posts, onAddPost, onLikePost, currentUser, onRequireAuth }: CommunityHubProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "tips" | "stories">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<"tips" | "stories" | "general">("tips");
  const [error, setError] = useState("");

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true;
    return post.category === activeFilter;
  });

  /* --------------------------- Comments state --------------------------- */
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const handleToggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setCommentError("");
    if (!commentsByPost[postId]) {
      setCommentsLoading(postId);
      try {
        const data = await fetchPostComments(postId);
        setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
      } catch {
        setCommentError("تعذر تحميل التعليقات. حاول مرة أخرى.");
      } finally {
        setCommentsLoading(null);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!currentUser) {
      onRequireAuth("الرجاء تسجيل الدخول أولاً لتتمكن من التعليق على المنشورات 💬");
      return;
    }
    if (!commentDraft.trim()) return;

    setCommentSubmitting(true);
    setCommentError("");
    try {
      const newComment = await insertPostComment(postId, {
        authorName: currentUser.username,
        text: commentDraft.trim(),
      });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setCommentDraft("");
    } catch {
      setCommentError("تعذر إرسال التعليق. حاول مرة أخرى.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !author) {
      setError("الرجاء ملء جميع حقول المشاركة.");
      return;
    }

    onAddPost({
      title,
      content,
      author,
      category,
    });

    // Reset Form
    setTitle("");
    setContent("");
    setAuthor("");
    setCategory("tips");
    setError("");
    setShowAddForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-brand-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-brand-600 fill-current" />
            ملتقى أليف للرعاية والمعرفة
          </h2>
          <p className="text-sm text-gray-500 font-bold mt-1">تشارك المعرفة، اقرأ قصص تبني ملهمة، واكتشف نصائح الخبراء في اليمن</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-600/10 transition-all cursor-pointer"
        >
          <PenTool className="w-4 h-4" />
          {showAddForm ? "إلغاء الكتابة" : "شارك تجربتك / نصيحتك"}
        </button>
      </div>

      {/* Write Post Form */}
      {showAddForm && (
        <div className="mb-8 p-6 bg-white rounded-3xl border border-brand-200 shadow-xl shadow-brand-900/5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand-500" />
            <h3 className="text-lg font-black text-brand-900">مشاركة منشور جديد</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</p>
            )}

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">عنوان المشاركة *</label>
              <input
                type="text"
                required
                placeholder="عنوان جذاب وملخص للفكرة..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">اسم الكاتب أو المربي *</label>
                <input
                  type="text"
                  required
                  placeholder="اسمك أو صفتك..."
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">قسم المنشور *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as "tips" | "stories" | "general")}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                >
                  <option value="tips">نصائح وإرشادات طبية ورعائية</option>
                  <option value="stories">قصة نجاح تبني سعيدة</option>
                  <option value="general">عام / نقاش واستفسار</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">المحتوى بالتفصيل *</label>
              <textarea
                required
                rows={5}
                placeholder="اكتب تفاصيل مشاركتك، نصائحك، أو قصة رفيقك الأليف هنا بأسلوب ودود ومفيد..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 rotate-180" />
                نشر في الملتقى
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1.5 bg-brand-50/50 rounded-2xl border border-[#f2eae0] mb-6">
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeFilter === "all" ? "bg-white text-brand-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          كل المشاركات ({posts.length})
        </button>
        <button
          onClick={() => setActiveFilter("tips")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeFilter === "tips" ? "bg-white text-brand-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          نصائح وإرشادات ({posts.filter(p => p.category === "tips").length})
        </button>
        <button
          onClick={() => setActiveFilter("stories")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeFilter === "stories" ? "bg-white text-brand-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          قصص تبني ناجحة ({posts.filter(p => p.category === "stories").length})
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-sm font-bold text-gray-400">لا توجد أي مشاركات في هذا القسم حالياً. كن أول من يشارك!</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-3xl border border-[#f3ede4] p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-300 space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-sm font-black border border-brand-100">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <span className="block text-sm font-extrabold text-gray-900">{post.author}</span>
                    <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">منشور في ملتقى أليف</span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                    post.category === "tips"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : post.category === "stories"
                      ? "bg-purple-50 text-purple-700 border-purple-100"
                      : "bg-gray-50 text-gray-700 border-gray-100"
                  }`}
                >
                  {post.category === "tips" ? "نصيحة ورعاية" : post.category === "stories" ? "قصة نجاح" : "عام"}
                </span>
              </div>

              {/* Title & Content */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              </div>

              {/* Footer / Interactions */}
              <div className="pt-4 border-t border-gray-50 flex items-center gap-4 text-xs font-bold text-gray-500">
                <button
                  onClick={() => onLikePost(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-50" />
                  أعجبني ({post.likes})
                </button>
                <button
                  onClick={() => handleToggleComments(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    expandedPostId === post.id ? "bg-brand-50 text-brand-700" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  التعليقات ({post.commentsCount})
                </button>
              </div>

              {/* Comments Section */}
              {expandedPostId === post.id && (
                <div className="pt-4 border-t border-gray-50 space-y-3">
                  {commentsLoading === post.id ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-bold">جاري تحميل التعليقات...</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(commentsByPost[post.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400 font-bold text-center py-3">لا توجد تعليقات بعد. كن أول من يعلّق!</p>
                      ) : (
                        commentsByPost[post.id].map((cm) => (
                          <div key={cm.id} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-black shrink-0">
                              {cm.authorName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-gray-800">{cm.authorName}</span>
                              <p className="text-xs text-gray-600 font-semibold leading-relaxed">{cm.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {commentError && (
                    <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">{commentError}</p>
                  )}

                  {/* Add comment box */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment(post.id);
                      }}
                      placeholder={currentUser ? "اكتب تعليقك هنا..." : "سجّل الدخول لإضافة تعليق..."}
                      className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={commentSubmitting}
                      className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>

    </div>
  );
}
