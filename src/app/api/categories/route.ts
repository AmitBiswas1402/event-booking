import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"
import { db } from "@/lib"
import { categories } from "@/db/schema"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const list = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name))
    return NextResponse.json(list)
  } catch (error) {
    console.error("GET /api/categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
