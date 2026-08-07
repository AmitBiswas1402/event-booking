"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Ticket, Users, X } from "lucide-react"
import { getZoneTheme } from "@/components/SeatSectionGrid"
import { formatPrice } from "@/lib/format"

type TicketType = {
  id: string
  name: string
  price: number
  quantity: number
  remainingQuantity: number
}

type Props = {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  showDate: string
  ticketTypes: TicketType[]
  initialTicketTypeId?: string | null
  initialQuantity?: number
  onConfirm: (ticketTypeId: string, quantity: number) => void
}

const QUANTITY_OPTIONS = [
  { count: 1, label: "Solo", icon: "🧍" },
  { count: 2, label: "Duo", icon: "👫" },
  { count: 3, label: "Trio", icon: "👨‍👩‍👦" },
  { count: 4, label: "Quad", icon: "🚗" },
  { count: 5, label: "Five", icon: "🚙" },
  { count: 6, label: "Six", icon: "🚌" },
  { count: 7, label: "Seven", icon: "🎉" },
  { count: 8, label: "Eight", icon: "🎊" },
  { count: 9, label: "Nine", icon: "🎶" },
  { count: 10, label: "Max", icon: "🔥" },
]

export default function BookingSetupModal({
  isOpen,
  onClose,
  eventTitle,
  showDate,
  ticketTypes,
  initialTicketTypeId,
  initialQuantity = 2,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    initialTicketTypeId ?? ticketTypes[0]?.id ?? ""
  )
  const [quantity, setQuantity] = useState(initialQuantity)

  const selectedType = ticketTypes.find((t) => t.id === selectedTypeId)
  const theme = selectedType ? getZoneTheme(selectedType.name) : null
  const subtotal = selectedType ? selectedType.price * quantity : 0
  const tax = Math.round(subtotal * 0.18)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!selectedTypeId) return
    onConfirm(selectedTypeId, quantity)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0f1020] shadow-2xl ring-1 ring-white/10">

          {/* Progress bar */}
          <div className="h-0.5 w-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-500"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#141626] to-[#0f1020] px-6 py-4">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex size-7 items-center justify-center rounded-full bg-white/10 text-slate-400 hover:bg-white/15 hover:text-white transition-all"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Step {step} of 2 · {step === 1 ? "Choose Zone" : "How many?"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-300 line-clamp-1">{eventTitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white transition-all"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ── STEP 1: Ticket Type ── */}
          {step === 1 && (
            <div className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-pink-500/20">
                  <Ticket className="size-4 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Choose your zone</h2>
                  <p className="text-[11px] text-slate-400">Select a ticket category for this event</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {ticketTypes.map((tt) => {
                  const t = getZoneTheme(tt.name)
                  const soldOut = tt.remainingQuantity <= 0
                  const isSelected = selectedTypeId === tt.id

                  if (isSelected) {
                    // ── SELECTED STATE — Glowing, high contrast, active theme accent ──
                    return (
                      <button
                        key={tt.id}
                        type="button"
                        onClick={() => setSelectedTypeId(tt.id)}
                        className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${t.border} ${t.ring} ring-2 bg-gradient-to-r from-[#1a1c2e] via-[#141628] to-[#0f1020] shadow-xl`}
                      >
                        {/* Glow accent */}
                        <div
                          className={`absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl ${t.bgSelected.split(" ")[0]}`}
                        />
                        {/* Left color pill bar */}
                        <span className={`absolute left-0 top-0 h-full w-1.5 rounded-l-2xl ${t.bgSelected.split(" ")[0]}`} />

                        <div className="relative flex items-center justify-between pl-2">
                          <div className="flex items-center gap-3.5">
                            <span className={`flex size-11 items-center justify-center rounded-2xl text-xl shadow-inner ${t.badge}`}>
                              {t.emoji}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white">{tt.name}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${t.badge}`}>
                                  Active
                                </span>
                              </div>
                              <p className={`mt-0.5 text-xs font-medium ${t.text}`}>
                                {soldOut ? "Sold out" : `${tt.remainingQuantity} seats available`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-base font-black ${t.text}`}>
                                {formatPrice(tt.price)}
                              </p>
                              <p className="text-[10px] text-slate-400">per ticket</p>
                            </div>
                            <div className={`flex size-6 items-center justify-center rounded-full ${t.bgSelected.split(" ")[0]} text-white shadow-md`}>
                              <CheckCircle2 className="size-4" />
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  }

                  // ── UNSELECTED STATE — Clean, clear outline ──
                  return (
                    <button
                      key={tt.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSelectedTypeId(tt.id)}
                      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-150 ${
                        soldOut
                          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-3">
                          <span className={`flex size-9 items-center justify-center rounded-xl text-lg opacity-75 ${t.badge}`}>
                            {t.emoji}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-200">{tt.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {soldOut ? "Sold out" : `${tt.remainingQuantity} seats left`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-base font-bold text-slate-300">
                              {formatPrice(tt.price)}
                            </p>
                            <p className="text-[10px] text-slate-500">per ticket</p>
                          </div>
                          <div className="size-5 rounded-full border-2 border-white/20 bg-transparent group-hover:border-white/40 transition-all" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Next button */}
              <button
                type="button"
                disabled={!selectedTypeId}
                onClick={() => setStep(2)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-950/40 transition-all hover:from-pink-400 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue — Pick quantity
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Quantity ── */}
          {step === 2 && (
            <div className="p-6">
              {/* Selected zone reminder */}
              {selectedType && theme && (
                <div className={`mb-5 flex items-center gap-3 rounded-2xl border p-3 ${theme.border} ${theme.badge.replace("border border-", "bg-").split(" ")[0]}/10`}>
                  <span className={`flex size-8 items-center justify-center rounded-xl text-base ${theme.badge}`}>
                    {theme.emoji}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{selectedType.name}</p>
                    <p className={`text-[11px] font-semibold ${theme.text}`}>{formatPrice(selectedType.price)} per ticket</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] text-slate-500 underline underline-offset-2 hover:text-slate-300"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/20">
                  <Users className="size-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">How many tickets?</h2>
                  <p className="text-[11px] text-slate-400">Pick the number of seats you need</p>
                </div>
              </div>

              {/* Quantity grid */}
              <div className="grid grid-cols-5 gap-2">
                {QUANTITY_OPTIONS.map((opt) => {
                  const isSelected = quantity === opt.count
                  const maxAvail = selectedType?.remainingQuantity ?? 10
                  const isDisabled = opt.count > maxAvail
                  return (
                    <button
                      key={opt.count}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setQuantity(opt.count)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 transition-all ${
                        isDisabled
                          ? "cursor-not-allowed border-white/5 opacity-30"
                          : isSelected
                            ? "border-pink-500 bg-gradient-to-b from-pink-500/25 to-violet-600/10 ring-2 ring-pink-500/30 scale-[1.05]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span className={`text-sm font-black ${isSelected ? "text-pink-300" : "text-white"}`}>
                        {opt.count}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500">{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Price preview */}
              {selectedType && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-xs text-slate-400">
                    {quantity} × {formatPrice(selectedType.price)}
                    <span className="ml-2 text-slate-600">+ 18% tax</span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-pink-300">{formatPrice(subtotal + tax)}</p>
                    <p className="text-[10px] text-slate-500">total estimate</p>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleConfirm}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-950/40 transition-all hover:from-pink-400 hover:to-violet-500"
              >
                <CheckCircle2 className="size-4" />
                Done — Now pick seats
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
