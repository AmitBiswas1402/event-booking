"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  Armchair,
  CheckCircle2,
  LayoutTemplate,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { getZoneTheme } from "@/components/SeatSectionGrid"
import { formatPrice } from "@/lib/format"

type Props = {
  isOpen: boolean
  onClose: () => void
  ticketTypeName: string
  ticketPrice: number
  totalSeats: number
  occupiedSeats: string[]
  initialSelected: string[]
  maxSelect: number
  onConfirm: (seats: string[]) => void
  layoutImageUrl?: string | null
  venueName?: string
}

const MIN_ZOOM = 0.35
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.2

export default function SeatSelectionModal({
  isOpen,
  onClose,
  ticketTypeName,
  ticketPrice,
  totalSeats,
  occupiedSeats,
  initialSelected,
  maxSelect,
  onConfirm,
  layoutImageUrl,
  venueName,
}: Props) {
  const theme = getZoneTheme(ticketTypeName)
  const prefix = theme.prefix

  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSelected)
  const [zoom, setZoom] = useState(0.75)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const seats = useMemo(
    () => Array.from({ length: totalSeats }, (_, i) => `${prefix}${i + 1}`),
    [totalSeats, prefix]
  )
  const occupiedSet = useMemo(() => new Set(occupiedSeats), [occupiedSeats])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSeats(initialSelected)
      setZoom(0.75)
      setPan({ x: 0, y: 0 })
    }
  }, [isOpen, initialSelected])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const toggleSeat = useCallback((seat: string) => {
    if (occupiedSet.has(seat)) return
    setSelectedSeats((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat)
      if (prev.length < maxSelect) return [...prev, seat]
      return [...prev.slice(1), seat]
    })
  }, [occupiedSet, maxSelect])

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))
  const resetView = () => { setZoom(0.75); setPan({ x: 0, y: 0 }) }

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)))
  }, [])

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: dragStart.panX + (e.clientX - dragStart.x),
      y: dragStart.panY + (e.clientY - dragStart.y),
    })
  }
  const handleMouseUp = () => setIsDragging(false)

  // Touch pan
  const touchRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y }
    }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current || e.touches.length !== 1) return
    setPan({
      x: touchRef.current.panX + (e.touches[0].clientX - touchRef.current.x),
      y: touchRef.current.panY + (e.touches[0].clientY - touchRef.current.y),
    })
  }

  const cols = totalSeats <= 20 ? 5 : totalSeats <= 50 ? 8 : totalSeats <= 100 ? 10 : totalSeats <= 200 ? 12 : 15
  const subtotal = ticketPrice * selectedSeats.length
  const tax = Math.round(subtotal * 0.18)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070810]">
      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-[#0d0d1a]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>
            {theme.emoji} {ticketTypeName}
          </span>
          <span className="text-sm font-semibold text-white">
            Select {maxSelect} seat{maxSelect > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-slate-400">
            {selectedSeats.length}/{maxSelect} selected
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ── Main canvas area ── */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { touchRef.current = null }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Zoomable / pannable seat grid */}
        <div
          className="absolute select-none"
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            top: "50%",
            left: "50%",
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          <div className="flex flex-col items-center gap-6 pb-10">
            {/* Stage */}
            <div className="flex w-full justify-center pt-4">
              <div
                className="rounded-b-3xl px-16 py-3 text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "3px solid rgba(255,255,255,0.15)",
                }}
              >
                🎭 Stage / Screen
              </div>
            </div>

            {/* Seat grid */}
            <div
              className="grid gap-2.5"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {seats.map((seat) => {
                const occupied = occupiedSet.has(seat)
                const isSelected = selectedSeats.includes(seat)
                return (
                  <button
                    key={seat}
                    type="button"
                    disabled={occupied}
                    onClick={() => toggleSeat(seat)}
                    aria-label={`Seat ${seat}`}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-[10px] font-bold transition-all duration-100 ${
                      occupied
                        ? "cursor-not-allowed opacity-20 bg-white/[0.03] border border-white/5"
                        : isSelected
                          ? `${theme.bgSelected} text-white shadow-xl ring-2 ${theme.ring} scale-110 border-transparent`
                          : `${theme.bgLight} ${theme.text} border ${theme.border} hover:scale-105`
                    }`}
                    style={{ width: 52, height: 52 }}
                  >
                    <Armchair className="mb-0.5 size-4 opacity-80" />
                    <span className="text-[9px] leading-none">{seat}</span>
                  </button>
                )
              })}
            </div>

            {/* Back wall label */}
            <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-600">
              ↑ Back of venue ↑
            </div>
          </div>
        </div>

        {/* ── Zoom controls (floating) ── */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={zoomIn}
            className="flex size-9 items-center justify-center rounded-xl border border-white/15 bg-[#1a1a2e]/90 text-white shadow-lg backdrop-blur-md hover:bg-white/10 transition-all"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="flex size-9 items-center justify-center rounded-xl border border-white/15 bg-[#1a1a2e]/90 text-white shadow-lg backdrop-blur-md hover:bg-white/10 transition-all"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="flex size-9 items-center justify-center rounded-xl border border-white/15 bg-[#1a1a2e]/90 text-slate-400 shadow-lg backdrop-blur-md hover:bg-white/10 hover:text-white transition-all"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        {/* ── Zoom % indicator ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <span className="rounded-full border border-white/10 bg-[#0d0d1a]/80 px-3 py-1 text-[10px] font-bold text-slate-400 backdrop-blur-md">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* ── Hint: drag to pan ── */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="rounded-full border border-white/10 bg-[#0d0d1a]/80 px-3 py-1 text-[10px] text-slate-500 backdrop-blur-md">
            Drag to pan · Scroll to zoom
          </span>
        </div>

        {/* ── Layout image mini preview (top-left) ── */}
        {layoutImageUrl && (
          <div className="absolute top-3 left-3 z-20 w-32 overflow-hidden rounded-xl border border-violet-500/30 bg-[#0d0d1a]/90 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-1.5 border-b border-violet-500/20 px-2 py-1">
              <LayoutTemplate className="size-2.5 text-violet-400" />
              <span className="text-[9px] font-bold uppercase tracking-wide text-violet-300">Layout</span>
            </div>
            <div className="relative h-16 w-full">
              <Image
                src={layoutImageUrl}
                alt="Venue layout"
                fill
                className="object-contain p-1"
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom confirmation bar ── */}
      <div className="relative z-10 border-t border-white/10 bg-[#0d0d1a]/95 backdrop-blur-md">
        {/* Selected seat chips */}
        {selectedSeats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-4 py-2">
            {selectedSeats.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSeat(s)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-all hover:opacity-70 ${theme.badge}`}
              >
                {s} <X className="size-2.5" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: legend */}
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded ${theme.bgSelected.split(" ")[0]}`} />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded border ${theme.border}`} />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded bg-white/[0.04]" />
              Taken
            </span>
          </div>

          {/* Right: price + confirm */}
          <div className="flex items-center gap-4">
            {selectedSeats.length > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400">
                  {selectedSeats.length} × {formatPrice(ticketPrice)}
                </p>
                <p className="text-sm font-black text-pink-300">
                  {formatPrice(subtotal + tax)}
                  <span className="ml-1 text-[10px] font-normal text-slate-500">incl. tax</span>
                </p>
              </div>
            )}
            <button
              type="button"
              disabled={selectedSeats.length < maxSelect}
              onClick={() => { onConfirm(selectedSeats); onClose() }}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all ${
                selectedSeats.length >= maxSelect
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 hover:shadow-pink-900/30"
                  : "bg-white/10 opacity-50 cursor-not-allowed"
              }`}
            >
              {selectedSeats.length >= maxSelect ? (
                <>
                  <CheckCircle2 className="size-4" />
                  Confirm {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}
                </>
              ) : (
                `Pick ${maxSelect - selectedSeats.length} more seat${maxSelect - selectedSeats.length > 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
