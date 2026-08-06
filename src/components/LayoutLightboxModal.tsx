"use client"

import { useState } from "react"
import Image from "next/image"
import { Maximize2, X, ZoomIn, ZoomOut } from "lucide-react"

interface LayoutLightboxModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  venueName: string
}

export default function LayoutLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  venueName,
}: LayoutLightboxModalProps) {
  const [zoom, setZoom] = useState(1)

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0f111a] shadow-2xl md:inset-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#161824] px-6 py-4">
          <div className="flex items-center gap-2">
            <Maximize2 className="size-4 text-pink-400" />
            <h3 className="text-sm font-bold text-white">Venue Seating Layout — {venueName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              title="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="text-xs font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              title="Zoom in"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="ml-2 flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto p-6 bg-black/40">
          <div
            className="relative transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          >
            <Image
              src={imageUrl}
              alt="Venue seating layout"
              width={1200}
              height={800}
              className="max-h-[75vh] w-auto rounded-xl object-contain shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      </div>
    </>
  )
}
