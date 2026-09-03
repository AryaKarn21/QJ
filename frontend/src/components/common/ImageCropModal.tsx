import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

// Lightweight, dependency-free "adjust your photo" modal: drag to reposition,
// slider to zoom, exported as a square JPEG blob. No cropper library added —
// just pointer-event math against a canvas, kept local to this one modal.

// Fixed at every breakpoint on purpose: it must equal the container's
// actual rendered box size below (w-56/h-56 = 224px), since the drag/zoom
// math and the canvas export both assume this exact value. A responsive
// size here (e.g. bigger on sm+) would silently desync the preview from
// what actually gets exported.
const CONTAINER_SIZE = 224; // CSS px of the preview viewport
const OUTPUT_SIZE = 512; // exported image resolution

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ file, onCancel, onConfirm, busy }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left, relative to container top-left, in container px
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  // Load the picked file into an <img> we can read natural dimensions from,
  // and reset zoom/position for it.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const img = new Image();
    img.onload = () => {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setZoom(1);
      // Center the "cover fit" image immediately.
      const baseScale = CONTAINER_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * baseScale;
      const h = img.naturalHeight * baseScale;
      setOffset({ x: (CONTAINER_SIZE - w) / 2, y: (CONTAINER_SIZE - h) / 2 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = natural.width && natural.height ? CONTAINER_SIZE / Math.min(natural.width, natural.height) : 1;
  const totalScale = baseScale * zoom;
  const displayedW = natural.width * totalScale;
  const displayedH = natural.height * totalScale;

  const clamp = (x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(CONTAINER_SIZE - w, x)),
    y: Math.min(0, Math.max(CONTAINER_SIZE - h, y)),
  });

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, nextZoom));
    const nextW = natural.width * baseScale * clampedZoom;
    const nextH = natural.height * baseScale * clampedZoom;
    // Keep whatever point is currently at the container's center still at
    // the center after zooming, instead of jumping.
    setOffset((prev) => {
      const centerFracX = displayedW ? (CONTAINER_SIZE / 2 - prev.x) / displayedW : 0.5;
      const centerFracY = displayedH ? (CONTAINER_SIZE / 2 - prev.y) / displayedH : 0.5;
      const nextX = CONTAINER_SIZE / 2 - centerFracX * nextW;
      const nextY = CONTAINER_SIZE / 2 - centerFracY * nextH;
      return clamp(nextX, nextY, nextW, nextH);
    });
    setZoom(clampedZoom);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = clamp(dragRef.current.startOffset.x + dx, dragRef.current.startOffset.y + dy, displayedW, displayedH);
    setOffset(next);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!imgRef.current || !natural.width) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const exportScale = OUTPUT_SIZE / CONTAINER_SIZE;
    ctx.drawImage(
      imgRef.current,
      0,
      0,
      natural.width,
      natural.height,
      offset.x * exportScale,
      offset.y * exportScale,
      displayedW * exportScale,
      displayedH * exportScale
    );
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Adjust your photo</h3>
        <p className="text-xs text-gray-500 mb-4">Drag to reposition, use the slider to zoom.</p>

        <div
          ref={containerRef}
          className="relative mx-auto rounded-full overflow-hidden bg-gray-100 touch-none select-none cursor-move w-56 h-56"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Selected"
              draggable={false}
              className="absolute pointer-events-none max-w-none"
              style={{
                width: displayedW,
                height: displayedH,
                left: offset.x,
                top: offset.y,
              }}
            />
          )}
          {/* Subtle ring so the crop boundary reads clearly against the image */}
          <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <ZoomOut size={16} className="text-gray-400 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <ZoomIn size={16} className="text-gray-400 shrink-0" />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={16} /> Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || !imgUrl}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Check size={16} /> {busy ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
