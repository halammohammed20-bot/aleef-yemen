import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Check, Move, Maximize2 } from "lucide-react";

interface ImageCropperProps {
  file: File;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
  /** رقم توضيحي: كم صورة متبقية بعد هذي في قائمة الرفع الحالية (لعرض "1 من 3" مثلاً) */
  queueLabel?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_BOX_SIZE = 40;
const HANDLE_SIZE = 22;

/**
 * أداة اقتصاص وتحكم بحجم الصورة قبل الرفع: تعرض الصورة مع إطار اقتصاص
 * قابل للسحب والتحجيم من الزوايا، ويعرض الأبعاد الفعلية الناتجة للمستخدم
 * ليتحكم بنفسه في حجم الصورة النهائية.
 */
export default function ImageCropper({ file, onCancel, onConfirm, queueLabel }: ImageCropperProps) {
  // 🔧 تشخيص مؤقت رقم 3: يؤكد هل أداة الاقتصاص فعلاً بدأت تُحمَّل (mount) في الصفحة
  useEffect(() => {
    alert(`تشخيص 3: أداة الاقتصاص بدأت التحميل الآن. اسم الملف: ${file.name}, الحجم: ${file.size} بايت`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [imgUrl, setImgUrl] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>({ x: 20, y: 20, w: 200, h: 200 });
  const [processing, setProcessing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const dragState = useRef<{
    mode: "move" | "resize" | null;
    corner?: "tl" | "tr" | "bl" | "br";
    startX: number;
    startY: number;
    startBox: Box;
  }>({ mode: null, startX: 0, startY: 0, startBox: { x: 0, y: 0, w: 0, h: 0 } });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    // شبكة أمان: لو الصورة ما اكتمل تحميلها أو فشلت خلال 4 ثوانٍ (بعض المتصفحات
    // على الجوال لا تُطلق onLoad ولا onError لصيغ غير مدعومة مثل HEIC القديمة)
    // نعرض تلقائياً خيار "رفع كما هي بدون اقتصاص" حتى لا يبقى المستخدم عالقاً.
    const safetyTimer = setTimeout(() => {
      setRenderedSize((prev) => {
        if (prev.w === 0) setLoadError(true);
        return prev;
      });
    }, 4000);
    return () => {
      URL.revokeObjectURL(url);
      clearTimeout(safetyTimer);
    };
  }, [file]);

  const measureImage = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // لسا ما اكتمل الـ layout، الخطوة التالية بتعيد المحاولة
    setRenderedSize({ w: rect.width, h: rect.height });
    // إطار اقتصاص ابتدائي يغطي 80% من منتصف الصورة (فقط أول مرة)
    setBox((prev) => {
      if (prev.w > MIN_BOX_SIZE + 1) return prev; // لا تصفّر الإطار لو المستخدم عدّله مسبقاً
      const w = rect.width * 0.8;
      const h = rect.height * 0.8;
      return { x: (rect.width - w) / 2, y: (rect.height - h) / 2, w, h };
    });
  };

  const handleImageLoad = () => {
    // نؤجل القياس بخطوة رسم واحدة لضمان اكتمال الـ layout فعلياً على الجوال
    // (متصفحات الجوال أحياناً تحسب أبعاد العنصر بشكل غير دقيق فور onLoad مباشرة)
    requestAnimationFrame(() => requestAnimationFrame(measureImage));
  };

  // إعادة القياس تلقائياً لو تغيّر حجم الشاشة (مثل اختفاء/ظهور شريط المتصفح على الجوال)
  useEffect(() => {
    const handleResize = () => measureImage();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clampBox = useCallback(
    (b: Box): Box => {
      let { x, y, w, h } = b;
      w = Math.max(MIN_BOX_SIZE, Math.min(w, renderedSize.w));
      h = Math.max(MIN_BOX_SIZE, Math.min(h, renderedSize.h));
      x = Math.max(0, Math.min(x, renderedSize.w - w));
      y = Math.max(0, Math.min(y, renderedSize.h - h));
      return { x, y, w, h };
    },
    [renderedSize]
  );

  const onPointerDownMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { mode: "move", startX: e.clientX, startY: e.clientY, startBox: box };
  };

  const onPointerDownResize = (corner: "tl" | "tr" | "bl" | "br") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { mode: "resize", corner, startX: e.clientX, startY: e.clientY, startBox: box };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state.mode) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const sb = state.startBox;

    if (state.mode === "move") {
      setBox(clampBox({ ...sb, x: sb.x + dx, y: sb.y + dy }));
    } else if (state.mode === "resize" && state.corner) {
      let { x, y, w, h } = sb;
      if (state.corner === "br") {
        w = sb.w + dx;
        h = sb.h + dy;
      } else if (state.corner === "bl") {
        x = sb.x + dx;
        w = sb.w - dx;
        h = sb.h + dy;
      } else if (state.corner === "tr") {
        y = sb.y + dy;
        w = sb.w + dx;
        h = sb.h - dy;
      } else if (state.corner === "tl") {
        x = sb.x + dx;
        y = sb.y + dy;
        w = sb.w - dx;
        h = sb.h - dy;
      }
      setBox(clampBox({ x, y, w, h }));
    }
  };

  const onPointerUp = () => {
    dragState.current.mode = null;
  };

  // الأبعاد الفعلية الناتجة بعد الاقتصاص (بالبكسل الحقيقي للصورة الأصلية)
  const scaleX = naturalSize.w && renderedSize.w ? naturalSize.w / renderedSize.w : 1;
  const scaleY = naturalSize.h && renderedSize.h ? naturalSize.h / renderedSize.h : 1;
  const outputW = Math.round(box.w * scaleX);
  const outputH = Math.round(box.h * scaleY);

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img) return;
    setProcessing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context error");

      ctx.drawImage(
        img,
        box.x * scaleX,
        box.y * scaleY,
        box.w * scaleX,
        box.h * scaleY,
        0,
        0,
        outputW,
        outputH
      );

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
      if (!blob) throw new Error("blob creation failed");

      const newName = file.name.replace(/\.[^.]+$/, "") + "-cropped.jpg";
      const croppedFile = new File([blob], newName, { type: "image/jpeg" });
      onConfirm(croppedFile);
    } finally {
      setProcessing(false);
    }
  };

  const estimatedKb = Math.round((outputW * outputH * 0.25) / 1024); // تقدير تقريبي فقط قبل الضغط الفعلي

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="w-full max-w-2xl max-h-[95vh] bg-white rounded-3xl shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-black text-gray-900">اقتصاص وتحكم بحجم الصورة ✂️</h3>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">
              اسحب الإطار لتحريكه، واسحب الزوايا لتكبيره أو تصغيره {queueLabel && `· ${queueLabel}`}
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-xl transition-all cursor-pointer shrink-0">
            <X className="w-4.5 h-4.5 text-gray-500" />
          </button>
        </div>

        {/* Crop area */}
        <div className="p-4 bg-gray-900 flex items-center justify-center overflow-auto">
          <div
            ref={containerRef}
            className="relative inline-block select-none touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img
              ref={imgRef}
              src={imgUrl}
              alt="crop preview"
              onLoad={handleImageLoad}
              onError={() => setLoadError(true)}
              className="max-h-[38vh] sm:max-h-[50vh] max-w-full block"
              draggable={false}
            />

            {renderedSize.w > 0 && (
              <>
                {/* Dark overlay outside crop box, using box-shadow trick */}
                <div
                  className="absolute border-2 border-white cursor-move"
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.w,
                    height: box.h,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                  onPointerDown={onPointerDownMove}
                >
                  {/* Move icon hint */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <Move className="w-5 h-5 text-white" />
                  </div>

                  {/* Corner handles */}
                  {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                    <div
                      key={corner}
                      onPointerDown={onPointerDownResize(corner)}
                      className="absolute bg-brand-500 border-2 border-white rounded-full cursor-nwse-resize"
                      style={{
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        top: corner.startsWith("t") ? -HANDLE_SIZE / 2 : "auto",
                        bottom: corner.startsWith("b") ? -HANDLE_SIZE / 2 : "auto",
                        left: corner.endsWith("l") ? -HANDLE_SIZE / 2 : "auto",
                        right: corner.endsWith("r") ? -HANDLE_SIZE / 2 : "auto",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {loadError && (
          <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-100 text-amber-800 text-[11px] font-bold rounded-xl text-center">
            تعذّر عرض هذه الصورة للاقتصاص (قد تكون بصيغة غير مدعومة من المتصفح). تقدر ترفعها كما هي بدون اقتصاص.
          </div>
        )}

        {/* Footer: size info + actions */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap shrink-0 sticky bottom-0 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl">
            <Maximize2 className="w-3.5 h-3.5" />
            {loadError
              ? "تعذر حساب الحجم"
              : `الحجم بعد الاقتصاص: ${outputW} × ${outputH} بكسل (~${estimatedKb > 1024 ? `${(estimatedKb / 1024).toFixed(1)} ميجا` : `${estimatedKb} كيلوبايت`} تقريباً)`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            {loadError ? (
              <button
                onClick={() => onConfirm(file)}
                className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                رفع الصورة كما هي (بدون اقتصاص)
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={processing || renderedSize.w === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                {processing ? "جاري المعالجة..." : "قص وإضافة الصورة"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
