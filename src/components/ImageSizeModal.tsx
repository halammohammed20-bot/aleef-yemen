import React, { useEffect, useRef, useState } from "react";
import { X, Check, SkipForward, Image as ImageIcon } from "lucide-react";

interface ImageSizeModalProps {
  file: File;
  fileIndex: number;
  totalFiles: number;
  onConfirm: (resizedFile: File) => void;
  onSkip: () => void;
  onCancelAll: () => void;
}

/**
 * نافذة تفاعلية تشبه أداة الاقتصاص: تظهر بعد اختيار كل صورة وتسمح للمستخدم
 * بالتحكم بحجم الصورة بنفسه عبر شريط تمرير، مع معاينة حية وحجم تقديري بالميجابايت.
 */
export default function ImageSizeModal({ file, fileIndex, totalFiles, onConfirm, onSkip, onCancelAll }: ImageSizeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [scalePercent, setScalePercent] = useState(70); // نسبة الحجم من الأصل
  const [originalDims, setOriginalDims] = useState({ width: 0, height: 0 });
  const [outputDims, setOutputDims] = useState({ width: 0, height: 0 });
  const [estimatedKB, setEstimatedKB] = useState<number | null>(null);
  const [processing, setProcessing] = useState(true);
  const [latestBlob, setLatestBlob] = useState<Blob | null>(null);

  // تحميل الصورة أول مرة
  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file).then((bmp) => {
      if (cancelled) return;
      bitmapRef.current = bmp;
      setOriginalDims({ width: bmp.width, height: bmp.height });
    });
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
    };
  }, [file]);

  // إعادة الرسم والحساب عند تغيير الشريط (بتأخير بسيط لتفادي إعادة الحساب المستمرة)
  useEffect(() => {
    if (!originalDims.width) return;
    setProcessing(true);
    const timeout = setTimeout(() => {
      const bmp = bitmapRef.current;
      const canvas = canvasRef.current;
      if (!bmp || !canvas) return;

      const width = Math.max(60, Math.round(originalDims.width * (scalePercent / 100)));
      const height = Math.max(60, Math.round(originalDims.height * (scalePercent / 100)));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bmp, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setLatestBlob(blob);
          setEstimatedKB(Math.round(blob.size / 1024));
          setOutputDims({ width, height });
          setProcessing(false);
        },
        "image/jpeg",
        0.85
      );
    }, 120);

    return () => clearTimeout(timeout);
  }, [scalePercent, originalDims]);

  const handleConfirm = () => {
    if (!latestBlob) return;
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    const resizedFile = new File([latestBlob], newName, { type: "image/jpeg" });
    onConfirm(resizedFile);
  };

  const originalSizeKB = Math.round(file.size / 1024);
  const savings = estimatedKB ? Math.max(0, Math.round((1 - estimatedKB / originalSizeKB) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-black text-gray-900">
              تحكم بحجم الصورة {totalFiles > 1 && `(${fileIndex + 1} من ${totalFiles})`}
            </h3>
          </div>
          <button onClick={onCancelAll} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
            <X className="w-4.5 h-4.5 text-gray-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 space-y-4">
          <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-[11px] font-bold text-gray-400 z-10">
                جاري التحديث...
              </div>
            )}
            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
          </div>

          {/* Slider Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-gray-500">
              <span>أصغر حجم</span>
              <span>أعلى جودة</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={scalePercent}
              onChange={(e) => setScalePercent(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-[10px] font-bold text-gray-400">الأبعاد</span>
              <span className="block text-xs font-black text-gray-800 mt-0.5">
                {outputDims.width}×{outputDims.height}
              </span>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-[10px] font-bold text-gray-400">الحجم التقديري</span>
              <span className="block text-xs font-black text-brand-700 mt-0.5">
                {estimatedKB ? `${estimatedKB} KB` : "..."}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="block text-[10px] font-bold text-emerald-600">وفّرت</span>
              <span className="block text-xs font-black text-emerald-700 mt-0.5">{savings}%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-5 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            تخطي هذي الصورة
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || !latestBlob}
            className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            تأكيد وإضافة الصورة
          </button>
        </div>
      </div>
    </div>
  );
}
