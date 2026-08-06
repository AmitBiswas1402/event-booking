"use client"

import { useCallback, useEffect, useRef, useState, DragEvent } from "react"
import Image from "next/image"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  LayoutTemplate,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  UploadCloud,
  X,
  Grid3x3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryOption = { id: string; name: string }

const SEAT_CATEGORIES = [
  { value: "REGULAR", label: "Regular", color: "#6b7280" },
  { value: "PREMIUM", label: "Premium", color: "#f59e0b" },
  { value: "RECLINER", label: "Recliner", color: "#8b5cf6" },
  { value: "VIP", label: "VIP", color: "#ec4899" },
  { value: "GOLD", label: "Gold", color: "#eab308" },
  { value: "SILVER", label: "Silver", color: "#94a3b8" },
  { value: "WHEELCHAIR", label: "Wheelchair", color: "#22d3ee" },
] as const
type SeatCategoryValue = (typeof SEAT_CATEGORIES)[number]["value"]

type ExistingShow = {
  id: string
  showDate: string
  startTime: string
  endTime: string | null
  totalSeats: number
  availableSeats: number
  status: string
  ticketTypes: {
    id: string
    name: string
    price: number
    quantity: number
    remainingQuantity: number
    seatCategory: SeatCategoryValue | null
  }[]
}

type FullEvent = {
  id: string
  slug: string
  title: string
  description: string | null
  bannerUrl: string | null
  language: string | null
  ageRestriction: string | null
  duration: number | null
  status: string
  categoryId: string
  venue: {
    id: string
    name: string
    address: string
    city: string
    state: string
    country: string
    postalCode: string | null
    layoutImageUrl: string | null
  }
}

export interface EditEventModalProps {
  slug: string
  categories: CategoryOption[]
  onClose: () => void
  onSaved: (updated: { title: string; status: string; venueLayoutImageUrl: string | null }) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

const catColor = (cat: SeatCategoryValue | null) =>
  SEAT_CATEGORIES.find((c) => c.value === cat)?.color ?? "#6b7280"

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditEventModal({ slug, categories, onClose, onSaved }: EditEventModalProps) {
  // Remote data
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [existingShows, setExistingShows] = useState<ExistingShow[]>([])

  // Event fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [language, setLanguage] = useState("")
  const [ageRestriction, setAgeRestriction] = useState("")
  const [duration, setDuration] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED">("DRAFT")

  // Venue fields
  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [venueCity, setVenueCity] = useState("")
  const [venueState, setVenueState] = useState("")
  const [venuePostalCode, setVenuePostalCode] = useState("")

  // Layout
  const [layoutImageUrl, setLayoutImageUrl] = useState("")
  const [layoutUrlInput, setLayoutUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isUploadingLayout, setIsUploadingLayout] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isDraggingLayout, setIsDraggingLayout] = useState(false)
  const layoutInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ─── Fetch full event data ─────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/events/${slug}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to load event")

        const ev: FullEvent = data.event
        setTitle(ev.title)
        setDescription(ev.description ?? "")
        setBannerUrl(ev.bannerUrl ?? "")
        setLanguage(ev.language ?? "")
        setAgeRestriction(ev.ageRestriction ?? "")
        setDuration(ev.duration ? String(ev.duration) : "")
        setCategoryId(ev.categoryId)
        setStatus(ev.status as typeof status)
        setVenueName(ev.venue.name)
        setVenueAddress(ev.venue.address)
        setVenueCity(ev.venue.city)
        setVenueState(ev.venue.state)
        setVenuePostalCode(ev.venue.postalCode ?? "")
        setLayoutImageUrl(ev.venue.layoutImageUrl ?? "")
        setExistingShows(data.shows ?? [])
      } catch (err) {
        setFetchErr(err instanceof Error ? err.message : "Could not load event.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  // ─── Upload helpers ────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || "Upload failed")
    return data.url as string
  }, [])

  const handleBannerFile = async (file: File) => {
    setErrorMsg(null)
    setIsUploadingBanner(true)
    try { setBannerUrl(await uploadFile(file)) }
    catch (err) { setErrorMsg(err instanceof Error ? err.message : "Banner upload failed.") }
    finally { setIsUploadingBanner(false) }
  }

  const handleLayoutFile = async (file: File) => {
    setErrorMsg(null)
    setIsUploadingLayout(true)
    try { setLayoutImageUrl(await uploadFile(file)) }
    catch (err) { setErrorMsg(err instanceof Error ? err.message : "Layout upload failed.") }
    finally { setIsUploadingLayout(false) }
  }

  const handleLayoutUrlUpload = async (rawUrl?: string) => {
    const target = (rawUrl ?? layoutUrlInput).trim()
    if (!target) return
    setErrorMsg(null)
    setIsUploadingLayout(true)
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to upload image URL via Cloudinary")
      setLayoutImageUrl(data.url)
      setLayoutUrlInput("")
      setShowUrlInput(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cloudinary link upload failed.")
    } finally {
      setIsUploadingLayout(false)
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!title.trim()) return setErrorMsg("Event title is required.")
    if (!categoryId) return setErrorMsg("Please select a category.")
    if (!venueName || !venueAddress || !venueCity || !venueState)
      return setErrorMsg("Venue name, address, city and state are required.")

    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          bannerUrl: bannerUrl || null,
          language: language || null,
          ageRestriction: ageRestriction || null,
          duration: duration ? Number(duration) : null,
          categoryId,
          status,
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState,
            postalCode: venuePostalCode || null,
            layoutImageUrl: layoutImageUrl || null,
          },
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Save failed")
      setSuccessMsg("Event saved successfully!")
      onSaved({ title, status, venueLayoutImageUrl: layoutImageUrl || null })
      setTimeout(onClose, 1200)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden border-l border-white/10 bg-[#0d0e14] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#10121a] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/20">
              <Pencil className="size-4 text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Edit Event</h2>
              <p className="text-[11px] text-slate-400">Changes are saved immediately to the database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="size-8 animate-spin text-violet-400" />
              <p className="text-sm text-slate-400">Loading event data…</p>
            </div>
          ) : fetchErr ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300">
              {fetchErr}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feedback banners */}
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/25 px-4 py-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="size-4 shrink-0" /> {successMsg}
                </div>
              )}

              {/* ── Section 1: Event details ── */}
              <Section label="Event Details" step="1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Title *">
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="h-9 bg-white/5 text-sm" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Tell your audience what to expect..."
                        className="w-full rounded-lg border border-input bg-white/5 px-3 py-2 text-sm outline-none focus-visible:border-ring"
                      />
                    </Field>
                  </div>
                  <Field label="Category *">
                    <div className="relative">
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-input bg-[#0d0e14] px-2.5 pr-8 text-sm outline-none focus-visible:border-ring"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </Field>
                  <Field label="Status">
                    <div className="relative">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as typeof status)}
                        className="h-9 w-full appearance-none rounded-lg border border-input bg-[#0d0e14] px-2.5 pr-8 text-sm outline-none focus-visible:border-ring"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </Field>
                  <Field label="Language">
                    <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. Hindi" className="h-9 bg-white/5 text-sm" />
                  </Field>
                  <Field label="Age restriction">
                    <Input value={ageRestriction} onChange={(e) => setAgeRestriction(e.target.value)} placeholder="e.g. 18+" className="h-9 bg-white/5 text-sm" />
                  </Field>
                  <Field label="Duration (minutes)">
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 180" className="h-9 bg-white/5 text-sm" />
                  </Field>
                  {/* Banner */}
                  <div className="sm:col-span-2">
                    <Field label="Banner image">
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]
                          e.target.value = ""
                          if (f) await handleBannerFile(f)
                        }}
                      />
                      {bannerUrl ? (
                        <div className="flex items-center gap-3">
                          <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10">
                            <Image src={bannerUrl} alt="Banner" fill sizes="112px" className="object-cover" unoptimized />
                          </div>
                          <div className="space-y-1.5">
                            <p className="max-w-[200px] truncate text-[11px] text-slate-400">{bannerUrl}</p>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={isUploadingBanner} onClick={() => bannerInputRef.current?.click()}>
                                <ImagePlus className="size-3.5" /> Change
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="text-xs text-rose-400" onClick={() => setBannerUrl("")}>Remove</Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploadingBanner}
                          onClick={() => bannerInputRef.current?.click()}
                          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 text-sm text-slate-300 transition-colors hover:border-pink-400/50 hover:text-white disabled:opacity-50"
                        >
                          {isUploadingBanner ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                          {isUploadingBanner ? "Uploading..." : "Upload banner"}
                        </button>
                      )}
                    </Field>
                  </div>
                </div>
              </Section>

              {/* ── Section 2: Venue ── */}
              <Section label="Venue" step="2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Venue name *">
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
                        <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. Netaji Indoor Stadium" className="h-9 bg-white/5 pl-8 text-sm" />
                      </div>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Address *">
                      <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} placeholder="Street address" className="h-9 bg-white/5 text-sm" />
                    </Field>
                  </div>
                  <Field label="City *">
                    <Input value={venueCity} onChange={(e) => setVenueCity(e.target.value)} placeholder="City" className="h-9 bg-white/5 text-sm" />
                  </Field>
                  <Field label="State *">
                    <Input value={venueState} onChange={(e) => setVenueState(e.target.value)} placeholder="State" className="h-9 bg-white/5 text-sm" />
                  </Field>
                  <Field label="Postal code">
                    <Input value={venuePostalCode} onChange={(e) => setVenuePostalCode(e.target.value)} placeholder="e.g. 700021" className="h-9 bg-white/5 text-sm" />
                  </Field>
                </div>
              </Section>

              {/* ── Section 3: Venue Layout ── */}
              <Section label="Venue Seating Layout" step="🗺" accent>
                <input
                  ref={layoutInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ""
                    if (f) await handleLayoutFile(f)
                  }}
                />
                {layoutImageUrl ? (
                  <div className="space-y-2.5">
                    <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-black/30">
                      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                        <Image src={layoutImageUrl} alt="Layout" fill sizes="600px" className="object-contain p-1" unoptimized />
                      </div>
                      <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-violet-900/80 px-2.5 py-0.5 text-[10px] font-semibold text-violet-200 backdrop-blur-sm">
                        <LayoutTemplate className="size-3" /> Seating Layout
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="text-xs" disabled={isUploadingLayout} onClick={() => layoutInputRef.current?.click()}>
                        <ImagePlus className="size-3.5" /> Replace file
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs text-violet-300 border-violet-500/30 hover:bg-violet-500/10" disabled={isUploadingLayout} onClick={() => setShowUrlInput((p) => !p)}>
                        <Link2 className="size-3.5 text-violet-400" /> Replace via link
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-xs text-rose-400 hover:text-rose-300" onClick={() => { setLayoutImageUrl(""); setShowUrlInput(false); }}>
                        Remove
                      </Button>
                    </div>
                    {showUrlInput && (
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={layoutUrlInput}
                          onChange={(e) => setLayoutUrlInput(e.target.value)}
                          placeholder="Paste Cloudinary / image link (e.g. https://...)"
                          className="h-8 bg-white/5 text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={isUploadingLayout || !layoutUrlInput.trim()}
                          onClick={() => handleLayoutUrlUpload()}
                          className="h-8 shrink-0 bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500"
                        >
                          {isUploadingLayout ? <Loader2 className="size-3 animate-spin" /> : "Upload Link"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2.5">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                      <p className="text-[11px] text-amber-300/90">No layout uploaded — audience won&apos;t see a venue map.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Option 1: File Drag & Drop */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingLayout(true) }}
                        onDragLeave={() => setIsDraggingLayout(false)}
                        onDrop={async (e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault()
                          setIsDraggingLayout(false)
                          const f = e.dataTransfer.files?.[0]
                          if (f?.type.startsWith("image/")) await handleLayoutFile(f)
                        }}
                        onClick={() => !isUploadingLayout && layoutInputRef.current?.click()}
                        className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                          isDraggingLayout ? "border-violet-400 bg-violet-500/10 scale-[1.01]" : "border-white/15 bg-white/[0.02] hover:border-violet-400/50 hover:bg-violet-500/5"
                        } ${isUploadingLayout ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {isUploadingLayout ? (
                          <><Loader2 className="size-5 animate-spin text-violet-400" /><p className="text-[11px] text-slate-400">Uploading file…</p></>
                        ) : (
                          <>
                            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/15">
                              <UploadCloud className="size-4 text-violet-400" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">{isDraggingLayout ? "Drop image here" : "Upload seating file"}</p>
                              <p className="mt-0.5 text-[10px] text-slate-500">Drag & drop or click · JPG, PNG, WEBP</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Option 2: Upload via Cloudinary Link */}
                      <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/[0.02] p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                            <div className="flex size-6 items-center justify-center rounded-md bg-violet-500/15">
                              <Link2 className="size-3.5 text-violet-400" />
                            </div>
                            <span>Upload via Image Link</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Paste Cloudinary or web image URL to host on Cloudinary</p>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Input
                            value={layoutUrlInput}
                            onChange={(e) => setLayoutUrlInput(e.target.value)}
                            placeholder="https://example.com/layout.jpg"
                            className="h-8 bg-white/5 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={isUploadingLayout || !layoutUrlInput.trim()}
                            onClick={() => handleLayoutUrlUpload()}
                            className="h-8 shrink-0 bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500"
                          >
                            {isUploadingLayout ? <Loader2 className="size-3 animate-spin" /> : "Upload Link"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Section>

              {/* ── Section 4: Shows (read-only) ── */}
              {existingShows.length > 0 && (
                <Section label="Shows" step="4">
                  <div className="space-y-3">
                    {existingShows.map((show) => (
                      <div key={show.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="size-3.5 shrink-0 text-pink-400" />
                            <span className="text-xs font-semibold text-slate-200">{fmt(show.showDate)}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            show.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-300"
                              : show.status === "CANCELLED" ? "bg-rose-500/15 text-rose-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}>
                            {show.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          <span>{show.totalSeats.toLocaleString()} seats</span>
                          <span>·</span>
                          <span className="text-emerald-400">{show.availableSeats.toLocaleString()} available</span>
                        </div>
                        {show.ticketTypes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {show.ticketTypes.map((t) => (
                              <span key={t.id} className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-300">
                                {t.seatCategory && (
                                  <span className="size-1.5 rounded-full" style={{ background: catColor(t.seatCategory) }} />
                                )}
                                <Ticket className="size-2.5" />
                                {t.name} · ₹{(t.price / 100).toLocaleString()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                    <Grid3x3 className="size-3" />
                    Existing shows are shown read-only. Manage bookings from the event page.
                  </p>
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !fetchErr && (
          <div className="shrink-0 border-t border-white/10 bg-[#10121a] px-6 py-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-sm"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-bold text-white hover:from-violet-500 hover:to-purple-500 disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Saving…</span>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  label, step, accent, children,
}: {
  label: string
  step: string | number
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-violet-500/20 bg-violet-950/10" : "border-white/10 bg-[#13141b]"}`}>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <span className={`flex size-5 items-center justify-center rounded-md text-[10px] ${accent ? "bg-violet-500/20 text-violet-300" : "bg-pink-500/20 text-pink-300"}`}>
          {step}
        </span>
        {label}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  )
}
