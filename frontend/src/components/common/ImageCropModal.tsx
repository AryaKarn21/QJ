import React, { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

// Lightweight, dependency-free "adjust your photo" modal: drag to reposition,
// slider to zoom, exported as a JPEG blob. No cropper library added — just
// pointer-event math against a canvas, kept local to this one component.
// Shared by the circular avatar crop and the wide cover-photo crop — the
// frame's shape/aspect ratio is the only thing that differs between them.

// Fixed (not responsive) on purpose: the drag/zoom math and the canvas
// export both assume the container's actual rendered pixel size, so it
// can't silently drift across breakpoints without desyncing the preview
// from what actually gets exported.
const CONTAINER_W = 280;
const OUTPUT_LONG_EDGE = 720; // longer output edge, in px; the other edge follows the aspect ratio

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
  /** width / height of the crop frame. 1 = square/circle avatar, >1 = wide banner. */
  aspect?: number;
  shape?: "circle" | "rect";
  title?: string;
  helpText?: string;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  file,
  onCancel,
  onConfirm,
  busy,
  aspect = 1,
  shape = "circle",
  title = "Adjust your photo",
  helpText = "Drag to reposition, use the slider to zoom.",
}) => {
  const containerW = CONTAINER_W;
  const containerH = CONTAINER_W / aspect;
  const outputW = aspect >= 1 ? OUTPUT_LONG_EDGE : Math.round(OUTPUT_LONG_EDGE * aspect);
  const outputH = aspect >= 1 ? Math.round(OUTPUT_LONG_EDGE / aspect) : OUTPUT_LONG_EDGE;

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left, relative to container top-left, in container px
  const dragRef = React.useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  // Load the picked file into an <img> we can read natural dimensions from
  // and later draw onto the export canvas, resetting zoom/position for it.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setZoom(1);
      // Center the "cover fit" image immediately.
      const baseScale = Math.max(containerW / img.naturalWidth, containerH / img.naturalHeight);
      const w = img.naturalWidth * baseScale;
      const h = img.naturalHeight * baseScale;
      setOffset({ x: (containerW - w) / 2, y: (containerH - h) / 2 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const baseScale = natural.width && natural.height ? Math.max(containerW / natural.width, containerH / natural.height) : 1;
  const totalScale = baseScale * zoom;
  const displayedW = natural.width * totalScale;
  const displayedH = natural.height * totalScale;

  const clamp = (x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(containerW - w, x)),
    y: Math.min(0, Math.max(containerH - h, y)),
  });

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, nextZoom));
    const nextW = natural.width * baseScale * clampedZoom;
    const nextH = natural.height * baseScale * clampedZoom;
    // Keep whatever point is currently at the frame's center still at the
    // center after zooming, instead of jumping.
    setOffset((prev) => {
      const centerFracX = displayedW ? (containerW / 2 - prev.x) / displayedW : 0.5;
      const centerFracY = displayedH ? (containerH / 2 - prev.y) / displayedH : 0.5;
      const nextX = containerW / 2 - centerFracX * nextW;
      const nextY = containerH / 2 - centerFracY * nextH;
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
    if (!imgEl || !natural.width) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const exportScaleX = outputW / containerW;
    const exportScaleY = outputH / containerH;
    ctx.drawImage(
      imgEl,
      0,
      0,
      natural.width,
      natural.height,
      offset.x * exportScaleX,
      offset.y * exportScaleY,
      displayedW * exportScaleX,
      displayedH * exportScaleY
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
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-4">{helpText}</p>

        <div
          className={`relative mx-auto overflow-hidden bg-gray-100 touch-none select-none cursor-move ${
            shape === "circle" ? "rounded-full" : "rounded-lg"
          }`}
          style={{ width: containerW, height: containerH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgUrl && (
            <img
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
          <div
            className={`absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none ${
              shape === "circle" ? "rounded-full" : "rounded-lg"
            }`}
          />
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
            <Check size={16} /> {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
