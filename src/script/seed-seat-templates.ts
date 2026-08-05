import "dotenv/config"
import { eq } from "drizzle-orm"
import { db } from "../lib"
import {
  seatSections,
  seatRows,
  seats,
  seatTemplates,
  seatLayoutTypeEnum,
  seatCategoryEnum,
} from "../db/schema"

type LayoutType = (typeof seatLayoutTypeEnum.enumValues)[number]
type Category = (typeof seatCategoryEnum.enumValues)[number]

type SeedSection = {
  id: string
  name: string
  hasSeats: boolean
  capacity?: number
  rows?: { id: string; label: string; seatCount: number; category: Category }[]
}

type SeedTemplate = {
  id: string
  name: string
  description: string
  type: LayoutType
  sections: SeedSection[]
}

const TEMPLATES: SeedTemplate[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Movie Hall",
    description: "A classic indoor cinema: screen-facing rows with premium, regular and recliner tiers.",
    type: "SEAT_SELECTION",
    sections: [
      {
        id: "00000000-0000-0000-0000-000000000101",
        name: "Premium",
        hasSeats: true,
        rows: [
          { id: "00000000-0000-0000-0000-000000000201", label: "A", seatCount: 10, category: "PREMIUM" },
          { id: "00000000-0000-0000-0000-000000000202", label: "B", seatCount: 12, category: "PREMIUM" },
        ],
      },
      {
        id: "00000000-0000-0000-0000-000000000102",
        name: "Regular",
        hasSeats: true,
        rows: [
          { id: "00000000-0000-0000-0000-000000000203", label: "C", seatCount: 14, category: "REGULAR" },
          { id: "00000000-0000-0000-0000-000000000204", label: "D", seatCount: 14, category: "REGULAR" },
        ],
      },
      {
        id: "00000000-0000-0000-0000-000000000103",
        name: "Recliner",
        hasSeats: true,
        rows: [
          { id: "00000000-0000-0000-0000-000000000205", label: "E", seatCount: 8, category: "RECLINER" },
        ],
      },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Indoor Auditorium",
    description: "Multi-tier theater with orchestra and balcony seating.",
    type: "SEAT_SELECTION",
    sections: [
      {
        id: "00000000-0000-0000-0000-000000000111",
        name: "Orchestra",
        hasSeats: true,
        rows: [
          { id: "00000000-0000-0000-0000-000000000211", label: "A", seatCount: 12, category: "REGULAR" },
          { id: "00000000-0000-0000-0000-000000000212", label: "B", seatCount: 14, category: "REGULAR" },
        ],
      },
      {
        id: "00000000-0000-0000-0000-000000000112",
        name: "Balcony",
        hasSeats: true,
        rows: [
          { id: "00000000-0000-0000-0000-000000000213", label: "A", seatCount: 10, category: "PREMIUM" },
          { id: "00000000-0000-0000-0000-000000000214", label: "B", seatCount: 10, category: "RECLINER" },
        ],
      },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Cricket Stadium",
    description: "Large outdoor stadium divided into stands. Capacity-based sections with optional rows.",
    type: "SECTION_BASED",
    sections: [
      { id: "00000000-0000-0000-0000-000000000121", name: "North Stand", hasSeats: false, capacity: 5000 },
      { id: "00000000-0000-0000-0000-000000000122", name: "South Stand", hasSeats: false, capacity: 5000 },
      { id: "00000000-0000-0000-0000-000000000123", name: "East Stand", hasSeats: false, capacity: 4000 },
      { id: "00000000-0000-0000-0000-000000000124", name: "West Stand", hasSeats: false, capacity: 4000 },
      { id: "00000000-0000-0000-0000-000000000125", name: "VIP Box", hasSeats: false, capacity: 250 },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Concert",
    description: "Live music venue. General admission tiered by quality/category with quantity-based capacity.",
    type: "GENERAL_ADMISSION",
    sections: [
      { id: "00000000-0000-0000-0000-000000000131", name: "VIP", hasSeats: false, capacity: 500 },
      { id: "00000000-0000-0000-0000-000000000132", name: "Gold", hasSeats: false, capacity: 1000 },
      { id: "00000000-0000-0000-0000-000000000133", name: "Silver", hasSeats: false, capacity: 1500 },
      { id: "00000000-0000-0000-0000-000000000134", name: "General Standing", hasSeats: false, capacity: 4000 },
    ],
  },
]

async function seedSeatTemplates() {
  for (const template of TEMPLATES) {
    const existing = await db
      .select({ id: seatTemplates.id })
      .from(seatTemplates)
      .where(eq(seatTemplates.id, template.id))
      .limit(1)

    if (existing.length > 0) {
      console.log(`Skipping existing template: ${template.name}`)
      continue
    }

    await db.insert(seatTemplates).values({
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      isSystem: true,
      createdBy: null,
    })

    for (const section of template.sections) {
      await db.insert(seatSections).values({
        id: section.id,
        seatTemplateId: template.id,
        name: section.name,
        description: null,
        sortOrder: 0,
        hasSeats: section.hasSeats,
        capacity: section.capacity ?? null,
      })

      if (section.hasSeats) {
        for (const row of section.rows ?? []) {
          await db.insert(seatRows).values({
            id: row.id,
            seatTemplateId: template.id,
            sectionId: section.id,
            label: row.label,
            seatCount: row.seatCount,
            sortOrder: 0,
            category: row.category,
          })

          await db.insert(seats).values(
            Array.from({ length: row.seatCount }, (_, i) => ({
              seatTemplateId: template.id,
              rowId: row.id,
              seatNumber: i + 1,
              category: row.category,
              isWheelchair: false,
              isBlocked: false,
              isAisle: false,
              sortOrder: i,
            }))
          )
        }
      }
    }

    console.log(`Created template: ${template.name}`)
  }

  const all = await db.select().from(seatTemplates)
  console.log("Templates:", JSON.stringify(all, null, 2))
  process.exit(0)
}

seedSeatTemplates().catch((err) => {
  console.error(err)
  process.exit(1)
})