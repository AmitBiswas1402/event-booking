import "dotenv/config"
import { eq, inArray } from "drizzle-orm"
import { db } from "../lib"
import {
  seatTemplates,
  users,
  venues,
  venueSeatLayouts,
  venueSeatSections,
  venueSeatRows,
  venueSeats,
  shows,
  ticketTypes,
  events,
  categories,
  showSeats,
} from "../db/schema"
import {
  cloneTemplateToVenue,
  materializeShowSeats,
} from "../lib/seatLayout"
import { holdSeats, releaseSeats, releaseExpiredHolds } from "../lib/seatLock"

const USER_ID = "smoke-test-user"
const VENUE_ID = "00000000-0000-0000-0000-00000000a001"
const EVENT_ID = "00000000-0000-0000-0000-00000000a002"
const SHOW_ID = "00000000-0000-0000-0000-00000000a003"
const SMOKE_LAYOUT_ID = "00000000-0000-0000-0000-00000000a004"

async function main() {
  // 0. pick a real template + a real user (for FK constraints)
  const [template] = await db
    .select()
    .from(seatTemplates)
    .where(eq(seatTemplates.name, "Movie Hall"))
    .limit(1)
  const [realUser] = await db.select().from(users).limit(1)
  if (!template || !realUser) {
    console.log("SKIP: need seeded templates + at least one user")
    return
  }

  // clean previous run
  await db.delete(showSeats).where(eq(showSeats.showId, SHOW_ID))
  await db.delete(ticketTypes).where(eq(ticketTypes.showId, SHOW_ID))
  await db.delete(shows).where(eq(shows.id, SHOW_ID))
  await db.delete(events).where(eq(events.id, EVENT_ID))
  await db.delete(venueSeats).where(eq(venueSeats.seatLayoutId, "00000000-0000-0000-0000-00000000a004"))
  await db.delete(venueSeatRows).where(eq(venueSeatRows.seatLayoutId, "00000000-0000-0000-0000-00000000a004"))
  await db.delete(venueSeatSections).where(eq(venueSeatSections.seatLayoutId, "00000000-0000-0000-0000-00000000a004"))
  await db.delete(venueSeatLayouts).where(eq(venueSeatLayouts.id, "00000000-0000-0000-0000-00000000a004"))
  await db.delete(venues).where(eq(venues.id, VENUE_ID))

  // 1. venue must exist before cloning (FK)
  await db.insert(venues).values({
    id: VENUE_ID,
    organizerId: realUser.id,
    name: "Smoke Venue",
    slug: "smoke-venue",
    address: "x",
    city: "y",
    state: "z",
    capacity: 0,
  })

  const cloned = await cloneTemplateToVenue(VENUE_ID, template.id)
  console.log("CLONED:", JSON.stringify(cloned))

  const rows = await db
    .select()
    .from(venueSeatRows)
    .where(eq(venueSeatRows.seatLayoutId, cloned.layoutId))
  const seatRowsAll = await db
    .select()
    .from(venueSeats)
    .where(eq(venueSeats.seatLayoutId, cloned.layoutId))
  console.log(`LAYOUT: ${rows.length} rows, ${seatRowsAll.length} seats`)

  // 2. create event + show + ticket types + materialize
  const [category] = await db.select().from(categories).limit(1)
  await db.insert(events).values({
    id: EVENT_ID,
    organizerId: realUser.id,
    categoryId: category.id,
    venueId: VENUE_ID,
    title: "Smoke Event",
    slug: "smoke-event",
    status: "PUBLISHED",
  })
  await db.insert(shows).values({
    id: SHOW_ID,
    eventId: EVENT_ID,
    seatLayoutId: cloned.layoutId,
    showDate: new Date("2026-12-25T10:00:00Z"),
    startTime: new Date("2026-12-25T10:00:00Z"),
    totalSeats: 0,
    availableSeats: 0,
  })

  const tickets = [
    {
      id: "00000000-0000-0000-0000-00000000a011",
      name: "Premium",
      category: "PREMIUM" as const,
      price: 40000,
    },
    {
      id: "00000000-0000-0000-0000-00000000a012",
      name: "Regular",
      category: "REGULAR" as const,
      price: 25000,
    },
    {
      id: "00000000-0000-0000-0000-00000000a013",
      name: "Recliner",
      category: "RECLINER" as const,
      price: 60000,
    },
  ]
  await db.insert(ticketTypes).values(
    tickets.map((t) => ({
      id: t.id,
      showId: SHOW_ID,
      name: t.name,
      seatCategory: t.category,
      price: t.price,
      quantity: 100,
      remainingQuantity: 100,
    }))
  )

  const materialized = await materializeShowSeats(
    SHOW_ID,
    cloned.layoutId,
    tickets.map((t) => ({ id: t.id, category: t.category as never, price: t.price }))
  )
  console.log("MATERIALIZED:", JSON.stringify(materialized))

  // 3. hold one seat
  const [aSeat] = await db.select().from(showSeats).where(eq(showSeats.showId, SHOW_ID)).limit(1)
  const hold = await holdSeats(SHOW_ID, realUser.id, [aSeat.id])
  console.log("HOLD:", JSON.stringify(hold))

  const [heldCheck] = await db
    .select()
    .from(showSeats)
    .where(eq(showSeats.id, aSeat.id))
    .limit(1)
  console.log("HELD STATE:", heldCheck.status, heldCheck.heldToken !== null, heldCheck.heldBy === realUser.id)

  // 4. release
  const released = await releaseSeats(SHOW_ID, realUser.id, [aSeat.id], hold.claimed[0]?.token)
  console.log("RELEASED:", released)

  const [availCheck] = await db
    .select()
    .from(showSeats)
    .where(eq(showSeats.id, aSeat.id))
    .limit(1)
  console.log("AVAILABLE AGAIN:", availCheck.status)

  // cleanup
  await db.delete(showSeats).where(eq(showSeats.showId, SHOW_ID))
  await db.delete(ticketTypes).where(eq(ticketTypes.showId, SHOW_ID))
  await db.delete(shows).where(eq(shows.id, SHOW_ID))
  await db.delete(events).where(eq(events.id, EVENT_ID))
  await db.delete(venueSeats).where(eq(venueSeats.seatLayoutId, cloned.layoutId))
  await db.delete(venueSeatRows).where(eq(venueSeatRows.seatLayoutId, cloned.layoutId))
  await db.delete(venueSeatSections).where(eq(venueSeatSections.seatLayoutId, cloned.layoutId))
  await db.delete(venueSeatLayouts).where(eq(venueSeatLayouts.id, cloned.layoutId))
  await db.delete(venues).where(eq(venues.id, VENUE_ID))
  console.log("SMOKE TEST OK")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
