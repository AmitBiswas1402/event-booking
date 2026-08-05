import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib"
import { seatTemplates, venueSeatLayouts, venues } from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import { slugify } from "@/lib/format"
import { cloneTemplateToVenue } from "@/lib/seatLayout"

export const dynamic = "force-dynamic"
export const revalidate = 0

type VenueInput = {
  name: string
  description?: string
  address: string
  city: string
  state: string
  country?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  capacity?: number
  imageUrl?: string
  templateId?: string
}

export async function GET() {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      )
    }

    const list = await db
      .select({
        venue: venues,
        layout: {
          id: venueSeatLayouts.id,
          type: venueSeatLayouts.type,
        },
        template: {
          id: seatTemplates.id,
          name: seatTemplates.name,
          type: seatTemplates.type,
        },
      })
      .from(venues)
      .leftJoin(venueSeatLayouts, eq(venueSeatLayouts.venueId, venues.id))
      .leftJoin(seatTemplates, eq(seatTemplates.id, venueSeatLayouts.sourceTemplateId))
      .where(eq(venues.organizerId, access.user.id))
      .orderBy(desc(venues.createdAt))

    return NextResponse.json({
      venues: list.map(({ venue, layout, template }) => ({
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        description: venue.description,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        postalCode: venue.postalCode,
        capacity: venue.capacity,
        hasLayout: Boolean(layout),
        layout: layout ? { id: layout.id, type: layout.type } : null,
        template: template ? { id: template.id, name: template.name, type: template.type } : null,
      })),
    })
  } catch (error) {
    console.error("GET /api/venues error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      )
    }

    const body = (await req.json()) as VenueInput
    if (!body.name?.trim()) return NextResponse.json({ error: "Venue name is required" }, { status: 400 })
    if (!body.address?.trim() || !body.city?.trim() || !body.state?.trim()) {
      return NextResponse.json({ error: "Address, city and state are required" }, { status: 400 })
    }

    const venueId = randomUUID()
    const slug = `${slugify(body.name)}-${randomUUID().slice(0, 6)}`

    let capacity = body.capacity
    let layout = null
    if (body.templateId) {
      layout = await cloneTemplateToVenue(venueId, body.templateId)
      if (!capacity) capacity = layout.capacity
    }

    const [venue] = await db
      .insert(venues)
      .values({
        id: venueId,
        organizerId: access.user.id,
        name: body.name.trim(),
        slug,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country ?? "India",
        postalCode: body.postalCode ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        capacity: capacity ?? null,
      })
      .returning({ id: venues.id, slug: venues.slug })

    return NextResponse.json(
      {
        success: true,
        venueId: venue.id,
        slug: venue.slug,
        layout: layout
          ? { id: layout.layoutId, type: layout.type, capacity: layout.capacity }
          : null,
        message: "Venue created",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/venues error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}