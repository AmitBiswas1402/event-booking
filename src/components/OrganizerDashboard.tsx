"use client"

import { useRef, useState, useCallback, DragEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Store,
  Ticket,
  Trash2,
  UploadCloud,
  X,
  LayoutTemplate,
  AlertCircle,
  Grid3x3,
  ChevronDown,
  Pencil,
  Link2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/format"
import EditEventModal from "@/components/EditEventModal"

// ─── Types ───────────────────────────────────────────────────────────────────

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

type SeatZone = {
  id: string
  name: string
  category: SeatCategoryValue
  capacity: string
  priceHint: string
}

type TicketTypeForm = {
  id: string
  name: string
  price: string
  quantity: string
  seatCategory: SeatCategoryValue | ""
}

type ShowForm = {
  id: string
  showDate: string
  startTime: string
  endTime: string
  totalSeats: string
  ticketTypes: TicketTypeForm[]
}

type InitialEvent = {
  id: string
  slug: string
  title: string
  status: string
  description: string | null
  venue: string
  venueId: string
  venueLayoutImageUrl: string | null
  createdAt: Date
  showCount: number
}

interface OrganizerDashboardProps {
  categories: CategoryOption[]
  initialEvents: InitialEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newId = () => Math.random().toString(36).slice(2, 10)

const emptyTicketType = (zone?: SeatZone): TicketTypeForm => ({
  id: newId(),
  name: zone ? zone.name : "",
  price: zone ? zone.priceHint : "",
  quantity: zone ? zone.capacity : "",
  seatCategory: zone ? zone.category : "",
})

const emptyShow = (zones: SeatZone[] = []): ShowForm => ({
  id: newId(),
  showDate: "",
  startTime: "",
  endTime: "",
  totalSeats: zones.reduce((s, z) => s + (parseInt(z.capacity) || 0), 0).toString() || "",
  ticketTypes: zones.length > 0 ? zones.map((z) => emptyTicketType(z)) : [emptyTicketType()],
})

const emptyZone = (): SeatZone => ({
  id: newId(),
  name: "",
  category: "REGULAR",
  capacity: "",
  priceHint: "",
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrganizerDashboard({ categories, initialEvents }: OrganizerDashboardProps) {
  // Event fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [language, setLanguage] = useState("")
  const [ageRestriction, setAgeRestriction] = useState("")
  const [duration, setDuration] = useState("")
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "")

  // Venue fields
  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [venueCity, setVenueCity] = useState("")
  const [venueState, setVenueState] = useState("")
  const [venuePostalCode, setVenuePostalCode] = useState("")

  // Venue layout
  const [layoutImageUrl, setLayoutImageUrl] = useState("")
  const [layoutUrlInput, setLayoutUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isUploadingLayout, setIsUploadingLayout] = useState(false)
  const [isDraggingLayout, setIsDraggingLayout] = useState(false)
  const layoutInputRef = useRef<HTMLInputElement>(null)

  // Seat zones
  const [seatZones, setSeatZones] = useState<SeatZone[]>([])

  // Shows
  const [shows, setShows] = useState<ShowForm[]>([emptyShow()])

  // UI state
  const [events, setEvents] = useState<InitialEvent[]>(initialEvents)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  // Edit modal
  const [editingSlug, setEditingSlug] = useState<string | null>(null)

  // ─── Upload helpers ────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || "Upload failed")
    return data.url as string
  }, [])

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setErrorMsg(null)
    setIsUploadingBanner(true)
    try {
      setBannerUrl(await uploadFile(file))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Banner upload failed.")
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleLayoutFile = async (file: File) => {
    setErrorMsg(null)
    setIsUploadingLayout(true)
    try {
      setLayoutImageUrl(await uploadFile(file))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Layout upload failed.")
    } finally {
      setIsUploadingLayout(false)
    }
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

  const handleLayoutInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) await handleLayoutFile(file)
  }

  const handleLayoutDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingLayout(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) await handleLayoutFile(file)
  }

  // ─── Seat zone helpers ─────────────────────────────────────────────────────

  const addZone = () => setSeatZones((prev) => [...prev, emptyZone()])

  const updateZone = (id: string, patch: Partial<SeatZone>) =>
    setSeatZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)))

  const removeZone = (id: string) =>
    setSeatZones((prev) => prev.filter((z) => z.id !== id))

  const syncShowsFromZones = (zones: SeatZone[]) => {
    setShows((prev) =>
      prev.map((show) => ({
        ...show,
        totalSeats:
          zones.reduce((s, z) => s + (parseInt(z.capacity) || 0), 0).toString() || show.totalSeats,
        ticketTypes:
          zones.length > 0
            ? zones.map((z) => {
                const existing = show.ticketTypes.find((t) => t.seatCategory === z.category)
                return existing
                  ? { ...existing, name: z.name || existing.name, quantity: z.capacity || existing.quantity }
                  : emptyTicketType(z)
              })
            : show.ticketTypes,
      }))
    )
  }

  // ─── Show / Ticket helpers ─────────────────────────────────────────────────

  const updateShow = (showId: string, patch: Partial<ShowForm>) =>
    setShows((prev) => prev.map((s) => (s.id === showId ? { ...s, ...patch } : s)))

  const updateTicket = (showId: string, ticketId: string, patch: Partial<TicketTypeForm>) =>
    setShows((prev) =>
      prev.map((s) =>
        s.id === showId
          ? { ...s, ticketTypes: s.ticketTypes.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)) }
          : s
      )
    )

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanShows = shows
      .filter((s) => s.showDate && s.startTime && s.totalSeats)
      .map((s) => ({
        showDate: s.showDate,
        startTime: s.startTime,
        endTime: s.endTime || null,
        totalSeats: Number(s.totalSeats),
        ticketTypes: s.ticketTypes
          .filter((t) => t.name && t.price && t.quantity)
          .map((t) => ({
            name: t.name,
            price: Math.round(parseFloat(t.price) * 100),
            quantity: Number(t.quantity),
            seatCategory: t.seatCategory || undefined,
          })),
      }))
      .filter((s) => s.ticketTypes.length > 0)

    if (!title.trim()) return setErrorMsg("Please enter an event title.")
    if (!categoryId) return setErrorMsg("Please select a category.")
    if (!venueName || !venueAddress || !venueCity || !venueState)
      return setErrorMsg("Please complete the venue details (name, address, city and state).")
    if (cleanShows.length === 0)
      return setErrorMsg("Add at least one show with a date, start time, capacity and a ticket type.")

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          bannerUrl: bannerUrl || undefined,
          language: language || undefined,
          ageRestriction: ageRestriction || undefined,
          duration: duration ? Number(duration) : undefined,
          categoryId,
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState,
            postalCode: venuePostalCode || undefined,
          },
          venueLayoutImageUrl: layoutImageUrl || undefined,
          shows: cleanShows,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to create event")

      setSuccessMsg(`"${title}" is now live. Audience can book seats for it!`)
      setTitle(""); setDescription(""); setBannerUrl(""); setLanguage("")
      setAgeRestriction(""); setDuration(""); setVenueName(""); setVenueAddress("")
      setVenueCity(""); setVenueState(""); setVenuePostalCode("")
      setLayoutImageUrl(""); setSeatZones([])
      setShows([emptyShow()])
      refreshEvents()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const refreshEvents = async () => {
    try {
      const res = await fetch("/api/events?organizer=me")
      if (res.ok) {
        const data = await res.json()
        setEvents(
          (data.events ?? []).map((e: InitialEvent & { venue: string; shows: unknown[] }) => ({
            id: e.id,
            slug: e.slug,
            title: e.title,
            status: e.status,
            description: e.description ?? null,
            venue: e.venue,
            venueId: e.venueId ?? "",
            venueLayoutImageUrl: e.venueLayoutImageUrl ?? null,
            createdAt: e.createdAt,
            showCount: (e.shows ?? []).length,
          }))
        )
      }
    } catch {
      // ignore
    }
  }

  const categoryColor = (cat: SeatCategoryValue) =>
    SEAT_CATEGORIES.find((c) => c.value === cat)?.color ?? "#6b7280"

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-[#090a0f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10121a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Store className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight">Organizer Dashboard</h1>
              <p className="text-[11px] text-slate-400">Create events, upload layouts and configure seat zones</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-pink-400/50 hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-bold">Create a new event</h2>
            <p className="text-xs text-slate-400">Fill in the details below — the event goes live immediately.</p>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs font-semibold text-rose-300">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* ── Step 1: Event Details ───────────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#16161d] p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <span className="flex size-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] text-pink-300">1</span>
              Event details
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Event title *">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Arijit Singh Live in Concert" className="h-9 bg-white/5 text-sm" />
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
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-[#16161d] px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Banner image">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
                {bannerUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                      <Image src={bannerUrl} alt="Banner preview" fill sizes="112px" className="object-cover" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="truncate text-xs text-slate-400">{bannerUrl}</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => bannerInputRef.current?.click()}>
                          <ImagePlus className="size-3.5" /> Change
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-xs text-rose-400 hover:text-rose-300" onClick={() => setBannerUrl("")}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={isUploadingBanner}
                    className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 text-sm text-slate-300 transition-colors hover:border-pink-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingBanner ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                    {isUploadingBanner ? "Uploading..." : "Upload banner image"}
                  </button>
                )}
                <p className="mt-1 text-[10px] text-slate-500">JPG, PNG, WEBP, GIF or AVIF. Max 10MB.</p>
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
            </div>
          </div>

          {/* ── Step 2: Venue ───────────────────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#16161d] p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <span className="flex size-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] text-pink-300">2</span>
              Venue
            </h3>
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
                  <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} placeholder="e.g. Eden Gardens Road" className="h-9 bg-white/5 text-sm" />
                </Field>
              </div>
              <Field label="City *">
                <Input value={venueCity} onChange={(e) => setVenueCity(e.target.value)} placeholder="e.g. Kolkata" className="h-9 bg-white/5 text-sm" />
              </Field>
              <Field label="State *">
                <Input value={venueState} onChange={(e) => setVenueState(e.target.value)} placeholder="e.g. West Bengal" className="h-9 bg-white/5 text-sm" />
              </Field>
              <Field label="Postal code">
                <Input value={venuePostalCode} onChange={(e) => setVenuePostalCode(e.target.value)} placeholder="e.g. 700021" className="h-9 bg-white/5 text-sm" />
              </Field>
            </div>
          </div>

          {/* ── Step 2.5: Venue Seating Layout ─────────────────────────── */}
          <div className="rounded-2xl border border-violet-500/20 bg-[#16161d] p-5">
            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <span className="flex size-5 items-center justify-center rounded-md bg-violet-500/20">
                <LayoutTemplate className="size-3 text-violet-300" />
              </span>
              Venue Seating Layout
            </h3>
            <p className="mb-5 text-[11px] text-slate-500">
              Upload your venue seating plan so the audience can understand which zones they&apos;re booking in.
            </p>

            {/* Hidden file input */}
            <input
              ref={layoutInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={handleLayoutInputChange}
            />

            {layoutImageUrl ? (
              /* ── Layout Preview ─────────────────────────────────────── */
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-black/30">
                  <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                    <Image
                      src={layoutImageUrl}
                      alt="Venue seating layout"
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                  {/* Badge overlay */}
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-violet-900/80 px-3 py-1 text-[10px] font-semibold text-violet-200 backdrop-blur-sm">
                    <LayoutTemplate className="size-3" />
                    Seating Layout Preview
                  </div>
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
              /* ── Side-by-side Upload Options ─────────────────────────── */
              <div>
                <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-amber-300">No seating layout uploaded</p>
                    <p className="mt-0.5 text-[11px] text-amber-400/80">
                      Your audience won&apos;t see a venue map. Upload a layout image so they understand the seating zones.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Option 1: File Drag & Drop */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingLayout(true) }}
                    onDragLeave={() => setIsDraggingLayout(false)}
                    onDrop={handleLayoutDrop}
                    onClick={() => !isUploadingLayout && layoutInputRef.current?.click()}
                    className={`flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                      isDraggingLayout
                        ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
                        : "border-white/15 bg-white/[0.02] hover:border-violet-400/50 hover:bg-violet-500/5"
                    } ${isUploadingLayout ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {isUploadingLayout ? (
                      <>
                        <Loader2 className="size-6 animate-spin text-violet-400" />
                        <p className="text-xs text-slate-400">Uploading layout...</p>
                      </>
                    ) : (
                      <>
                        <div className={`flex size-10 items-center justify-center rounded-xl transition-colors ${isDraggingLayout ? "bg-violet-500/30" : "bg-violet-500/15"}`}>
                          <UploadCloud className="size-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {isDraggingLayout ? "Drop image here" : "Upload seating file"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">Drag & drop or click · JPG, PNG, WEBP</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Option 2: Upload via Cloudinary Link */}
                  <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/[0.02] p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/15">
                          <Link2 className="size-4 text-violet-400" />
                        </div>
                        <span>Upload via Image Link</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Paste Cloudinary or web image URL to host on Cloudinary</p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Input
                        value={layoutUrlInput}
                        onChange={(e) => setLayoutUrlInput(e.target.value)}
                        placeholder="https://example.com/layout.jpg"
                        className="h-9 bg-white/5 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUploadingLayout || !layoutUrlInput.trim()}
                        onClick={() => handleLayoutUrlUpload()}
                        className="h-9 shrink-0 bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500"
                      >
                        {isUploadingLayout ? <Loader2 className="size-3.5 animate-spin" /> : "Upload Link"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Seat Zone Builder ────────────────────────────────────── */}
            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Grid3x3 className="size-3.5" />
                  Seat zones / sections
                </p>
                {seatZones.length > 0 && (
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    {seatZones.reduce((s, z) => s + (parseInt(z.capacity) || 0), 0).toLocaleString()} total seats
                  </span>
                )}
              </div>

              {seatZones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center">
                  <Grid3x3 className="mx-auto mb-2 size-6 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No seat zones defined yet</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Define zones like &ldquo;Gold&rdquo;, &ldquo;Silver&rdquo;, &ldquo;VIP&rdquo; — they&apos;ll auto-fill ticket types for your shows.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="grid gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:grid-cols-[1fr_1.2fr_0.7fr_0.7fr_auto]">
                    <span>Zone name</span><span>Category</span><span>Seats</span><span>Price (₹)</span><span />
                  </div>
                  {seatZones.map((zone) => (
                    <div key={zone.id} className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 sm:grid-cols-[1fr_1.2fr_0.7fr_0.7fr_auto] items-center">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: categoryColor(zone.category) }} />
                        <Input
                          value={zone.name}
                          onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                          placeholder="e.g. Gold"
                          className="h-8 bg-white/5 text-xs"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={zone.category}
                          onChange={(e) => updateZone(zone.id, { category: e.target.value as SeatCategoryValue })}
                          className="h-8 w-full appearance-none rounded-lg border border-input bg-[#16161d] px-2.5 pr-7 text-xs outline-none focus-visible:border-ring"
                        >
                          {SEAT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-slate-500" />
                      </div>
                      <Input type="number" min={1} value={zone.capacity} onChange={(e) => updateZone(zone.id, { capacity: e.target.value })} placeholder="200" className="h-8 bg-white/5 text-xs" />
                      <Input type="number" min={0} value={zone.priceHint} onChange={(e) => updateZone(zone.id, { priceHint: e.target.value })} placeholder="1500" className="h-8 bg-white/5 text-xs" />
                      <button
                        type="button"
                        onClick={() => removeZone(zone.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                        aria-label="Remove zone"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addZone} className="text-xs">
                  <Plus className="size-3.5" /> Add zone
                </Button>
                {seatZones.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => syncShowsFromZones(seatZones)}
                    className="text-xs text-violet-300 hover:text-violet-200"
                  >
                    Sync zones → shows
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Step 3: Shows & Capacity ────────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#16161d] p-5">
            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <span className="flex size-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] text-pink-300">3</span>
              Shows &amp; capacity
            </h3>
            <p className="mb-4 text-[11px] text-slate-500">
              Each show has its own date, capacity and ticket types.
              {seatZones.length > 0 && (
                <span className="ml-1 text-violet-400">Ticket types are pre-filled from your seat zones.</span>
              )}
            </p>

            <div className="space-y-4">
              {shows.map((show) => (
                <div key={show.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <CalendarDays className="size-3.5 text-pink-400" />
                      Show
                    </span>
                    {shows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShows((prev) => prev.filter((s) => s.id !== show.id))}
                        className="text-slate-500 transition-colors hover:text-rose-400"
                        aria-label="Remove show"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Show date *">
                      <Input type="date" value={show.showDate} onChange={(e) => updateShow(show.id, { showDate: e.target.value })} className="h-9 bg-white/5 text-sm" />
                    </Field>
                    <Field label="Start time *">
                      <Input type="datetime-local" value={show.startTime} onChange={(e) => updateShow(show.id, { startTime: e.target.value })} className="h-9 bg-white/5 text-sm" />
                    </Field>
                    <Field label="End time">
                      <Input type="datetime-local" value={show.endTime} onChange={(e) => updateShow(show.id, { endTime: e.target.value })} className="h-9 bg-white/5 text-sm" />
                    </Field>
                    <Field label="Audience capacity *">
                      <Input type="number" min={1} value={show.totalSeats} onChange={(e) => updateShow(show.id, { totalSeats: e.target.value })} placeholder="Total seats" className="h-9 bg-white/5 text-sm" />
                    </Field>
                  </div>

                  {/* Ticket types */}
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <Ticket className="size-3.5" />
                      Ticket types
                      {seatZones.length > 0 && (
                        <span className="ml-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-violet-300">
                          from zones
                        </span>
                      )}
                    </p>
                    <div className="space-y-2.5">
                      {/* Column headers */}
                      <div className="grid gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
                        <span>Name</span><span>Price (₹)</span><span>Qty</span><span>Seat category</span><span />
                      </div>
                      {show.ticketTypes.map((ticket) => (
                        <div key={ticket.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto] items-center">
                          <Input
                            value={ticket.name}
                            onChange={(e) => updateTicket(show.id, ticket.id, { name: e.target.value })}
                            placeholder="e.g. Silver"
                            className="h-9 bg-white/5 text-sm"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={ticket.price}
                            onChange={(e) => updateTicket(show.id, ticket.id, { price: e.target.value })}
                            placeholder="Price"
                            className="h-9 bg-white/5 text-sm"
                          />
                          <Input
                            type="number"
                            min={1}
                            value={ticket.quantity}
                            onChange={(e) => updateTicket(show.id, ticket.id, { quantity: e.target.value })}
                            placeholder="Qty"
                            className="h-9 bg-white/5 text-sm"
                          />
                          <div className="relative">
                            {ticket.seatCategory && (
                              <span
                                className="pointer-events-none absolute left-2.5 top-1/2 size-2 -translate-y-1/2 rounded-full"
                                style={{ background: categoryColor(ticket.seatCategory as SeatCategoryValue) }}
                              />
                            )}
                            <select
                              value={ticket.seatCategory}
                              onChange={(e) => updateTicket(show.id, ticket.id, { seatCategory: e.target.value as SeatCategoryValue | "" })}
                              className="h-9 w-full appearance-none rounded-lg border border-input bg-[#16161d] pl-6 pr-7 text-xs outline-none focus-visible:border-ring"
                            >
                              <option value="">— Any category —</option>
                              {SEAT_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-slate-500" />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateShow(show.id, { ticketTypes: show.ticketTypes.filter((t) => t.id !== ticket.id) })}
                            className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                            aria-label="Remove ticket type"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateShow(show.id, { ticketTypes: [...show.ticketTypes, emptyTicketType()] })}
                      className="mt-2.5 text-xs"
                    >
                      <Plus className="size-3.5" /> Add ticket type
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShows((prev) => [...prev, emptyShow(seatZones)])}
              className="mt-3 text-xs"
            >
              <Plus className="size-3.5" /> Add another show
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:from-pink-400 hover:to-violet-500"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Publishing event...
              </span>
            ) : (
              "Publish Event"
            )}
          </Button>
        </section>

        {/* ── Right sidebar: My Events ───────────────────────────────────── */}
        <aside className="space-y-4">
          <div>
            <h2 className="text-base font-bold">My events</h2>
            <p className="text-xs text-slate-400">{events.length} event(s) published</p>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#16161d] p-8 text-center">
              <CalendarDays className="mx-auto mb-3 size-8 text-slate-500" />
              <p className="text-sm font-semibold">No events yet</p>
              <p className="mt-1 text-xs text-slate-400">Create your first event and set its audience capacity to go live.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161d] ring-1 ring-white/5">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{event.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{event.venue}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          event.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-300"
                            : event.status === "CANCELLED" ? "bg-rose-500/15 text-rose-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{event.showCount} show(s)</span>
                      <div className="flex items-center gap-1.5">
                        <LayoutTemplate className="size-3" />
                        {event.venueLayoutImageUrl
                          ? <span className="text-emerald-400">Layout uploaded</span>
                          : <span className="text-amber-400">No layout</span>
                        }
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Added {formatDateTime(event.createdAt)}</p>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                      <button
                        type="button"
                        onClick={() => setEditingSlug(event.slug)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-all hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-200"
                      >
                        <Pencil className="size-3" /> Edit event
                      </button>
                      <Link
                        href={`/events/${event.slug}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-all hover:border-pink-400/50 hover:bg-pink-500/10 hover:text-pink-200"
                      >
                        View page
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>

    {/* ── Full Edit Modal ───────────────────────────────────────── */}
    {editingSlug && (
      <EditEventModal
        slug={editingSlug}
        categories={categories}
        onClose={() => setEditingSlug(null)}
        onSaved={({ title, status, venueLayoutImageUrl }) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.slug === editingSlug
                ? { ...e, title, status, venueLayoutImageUrl }
                : e
            )
          )
        }}
      />
    )}
    </>
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
