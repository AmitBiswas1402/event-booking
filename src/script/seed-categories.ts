import "dotenv/config"
import { db } from "../lib"
import { categories } from "../db/schema"

const DEFAULT_CATEGORIES = [
  { name: "Movies", slug: "movies", imageUrl: null },
  { name: "Concerts", slug: "concerts", imageUrl: null },
  { name: "Sports", slug: "sports", imageUrl: null },
  { name: "Events", slug: "events", imageUrl: null },
]

async function seedCategories() {
  const existing = await db.select({ slug: categories.slug }).from(categories)
  const existingSlugs = new Set(existing.map((c) => c.slug))

  for (const category of DEFAULT_CATEGORIES) {
    if (!existingSlugs.has(category.slug)) {
      await db.insert(categories).values(category)
      console.log(`Created category: ${category.name}`)
    } else {
      console.log(`Skipping existing category: ${category.name}`)
    }
  }

  const all = await db.select().from(categories)
  console.log("Categories:", JSON.stringify(all, null, 2))
  process.exit(0)
}

seedCategories().catch((err) => {
  console.error(err)
  process.exit(1)
})
