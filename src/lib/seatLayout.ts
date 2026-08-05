import { randomUUID } from "crypto"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib"
import {
  seatRows,
  seatSections,
  seats,
  seatTemplates,
  showSeats,
  venueSeatLayouts,
  venueSeatRows,
  venueSeatSections,
  venueSeats,
} from "@/db/schema"
import type { seatCategoryEnum, seatLayoutTypeEnum } from "@/db/schema"

type LayoutType = (typeof seatLayoutTypeEnum.enumValues)[number]
type Category = (typeof seatCategoryEnum.enumValues)[number]

// ==========================================================
// TEMPLATE GEOMETRY
// ==========================================================

export type TemplateGeometry = {
  templateId: string
  type: LayoutType
  sections: {
    id: string
    name: string
    hasSeats: boolean
    capacity: number | null
    sortOrder: number
    rows: {
      id: string
      label: string
      seatCount: number
      category: Category
      sortOrder: number
      seats: {
        seatNumber: number
        category: Category
        isWheelchair: boolean
        isBlocked: boolean
        isAisle: boolean
        sortOrder: number
      }[]
    }[]
  }[]
}

export async function getTemplateGeometry(templateId: string): Promise<TemplateGeometry> {
  const [template] = await db
    .select()
    .from(seatTemplates)
    .where(eq(seatTemplates.id, templateId))
    .limit(1)
  if (!template) throw new Error("Template not found")

  const sections = await db
    .select()
    .from(seatSections)
    .where(eq(seatSections.seatTemplateId, templateId))
    .orderBy(seatSections.sortOrder)

  const sectionIds = sections.map((s) => s.id)
  const rows = sectionIds.length
    ? await db.select().from(seatRows).where(eq(seatRows.seatTemplateId, templateId))
    : []
  const rowIds = rows.map((r) => r.id)
  const seatList = rowIds.length
    ? await db.select().from(seats).where(inArray(seats.rowId, rowIds))
    : []

  const rowsBySection = groupBy(rows, (r) => r.sectionId)
  const seatsByRow = groupBy(seatList, (s) => s.rowId)

  return {
    templateId: template.id,
    type: template.type,
    sections: sections.map((section) => ({
      id: section.id,
      name: section.name,
      hasSeats: section.hasSeats,
      capacity: section.capacity,
      sortOrder: section.sortOrder,
      rows: (rowsBySection.get(section.id) ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        seatCount: row.seatCount,
        category: row.category,
        sortOrder: row.sortOrder,
        seats: (seatsByRow.get(row.id) ?? []).map((seat) => ({
          seatNumber: seat.seatNumber,
          category: seat.category,
          isWheelchair: seat.isWheelchair,
          isBlocked: seat.isBlocked,
          isAisle: seat.isAisle,
          sortOrder: seat.sortOrder,
        })),
      })),
    })),
  }
}

// ==========================================================
// CLONE: template -> venue seat layout
// ==========================================================

export type ClonedLayout = {
  layoutId: string
  type: LayoutType
  capacity: number
  sectionCount: number
  rowCount: number
  seatCount: number
}

export async function cloneTemplateToVenue(
  venueId: string,
  templateId: string
): Promise<ClonedLayout> {
  const geometry = await getTemplateGeometry(templateId)
  const layoutId = randomUUID()

  const sectionIdMap = new Map<string, string>()
  const rowIdMap = new Map<string, string>()

  const venueSections = geometry.sections.map((section) => {
    const newId = randomUUID()
    sectionIdMap.set(section.id, newId)
    return {
      id: newId,
      seatLayoutId: layoutId,
      name: section.name,
      description: null,
      sortOrder: section.sortOrder ?? 0,
      hasSeats: section.hasSeats,
      capacity: section.capacity,
    }
  })

  const venueRows = geometry.sections.flatMap((section) =>
    section.rows.map((row) => {
      const newId = randomUUID()
      rowIdMap.set(row.id, newId)
      return {
        id: newId,
        seatLayoutId: layoutId,
        sectionId: sectionIdMap.get(section.id)!,
        label: row.label,
        seatCount: row.seatCount,
        sortOrder: row.sortOrder ?? 0,
        category: row.category,
      }
    })
  )

  const venueSeatList = geometry.sections.flatMap((section) =>
    section.rows.flatMap((row) =>
      row.seats.map((seat) => ({
        id: randomUUID(),
        seatLayoutId: layoutId,
        rowId: rowIdMap.get(row.id)!,
        seatNumber: seat.seatNumber,
        category: seat.category,
        isWheelchair: seat.isWheelchair,
        isBlocked: seat.isBlocked,
        isAisle: seat.isAisle,
        sortOrder: seat.sortOrder,
      }))
    )
  )

  await db.batch([
    db.insert(venueSeatLayouts).values({
      id: layoutId,
      venueId,
      sourceTemplateId: templateId,
      type: geometry.type,
    }),
    db.insert(venueSeatSections).values(venueSections),
    db.insert(venueSeatRows).values(venueRows),
    db.insert(venueSeats).values(venueSeatList),
  ])

  const capacity = geometry.sections.reduce(
    (sum, s) =>
      sum +
      (s.hasSeats
        ? s.rows.reduce((r, row) => r + row.seatCount, 0)
        : (s.capacity ?? 0)),
    0
  )

  return {
    layoutId,
    type: geometry.type,
    capacity,
    sectionCount: venueSections.length,
    rowCount: venueRows.length,
    seatCount: venueSeatList.length,
  }
}

// ==========================================================
// MATERIALIZE: layout -> show_seats (per-show availability)
// ==========================================================
// For SEAT_SELECTION (and SECTION_BASED with seats), generate one
// show_seats row per physical seat. GA / seatless sections are
// handled by ticket_types quantity counters instead.

export type TicketTypeForSeat = {
  id: string
  category: Category | null
  price: number
}

export type MaterializeResult = {
  materialized: number
  capacity: number
}

export async function materializeShowSeats(
  showId: string,
  layoutId: string,
  ticketTypes: TicketTypeForSeat[]
): Promise<MaterializeResult> {
  const priceByCategory = new Map<Category, number>()
  const ticketIdByCategory = new Map<Category, string>()
  for (const tt of ticketTypes) {
    if (!tt.category) continue
    if (!priceByCategory.has(tt.category)) {
      priceByCategory.set(tt.category, tt.price)
      ticketIdByCategory.set(tt.category, tt.id)
    }
  }

  const rows = await db
    .select()
    .from(venueSeatRows)
    .where(eq(venueSeatRows.seatLayoutId, layoutId))
    .orderBy(venueSeatRows.sortOrder)
  const rowIds = rows.map((r) => r.id)

  const seatList = rowIds.length
    ? await db.select().from(venueSeats).where(inArray(venueSeats.rowId, rowIds))
    : []

  if (seatList.length === 0) return { materialized: 0, capacity: 0 }

  const rowById = new Map(rows.map((r) => [r.id, r]))

  const showSeatRows = seatList.map((seat) => {
    const row = rowById.get(seat.rowId)
    const price = priceByCategory.get(seat.category) ?? 0
    return {
      id: randomUUID(),
      showId,
      venueSeatId: seat.id,
      label: `${row?.label ?? ""}${seat.seatNumber}`,
      category: seat.category,
      price,
      ticketTypeId: ticketIdByCategory.get(seat.category) ?? null,
      status: seat.isBlocked ? ("BLOCKED" as const) : ("AVAILABLE" as const),
      heldBy: null,
      heldUntil: null,
      heldToken: null,
    }
  })

  // Insert in chunks to keep request sizes sane for very large venues.
  const CHUNK = 500
  for (let i = 0; i < showSeatRows.length; i += CHUNK) {
    await db.insert(showSeats).values(showSeatRows.slice(i, i + CHUNK))
  }

  return { materialized: seatList.length, capacity: seatList.length }
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }
  return map
}
