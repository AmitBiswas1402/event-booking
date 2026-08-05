export type HomeEvent = {
  id: string
  slug: string
  title: string
  bannerUrl: string | null
  isFeatured: boolean
  category: string
  venue: string
  city: string
  showDate: Date | null
  lowestPrice: number | null
}

export type HeroSlide = {
  id: number
  title: string
  category: string
  image: string
  slug: string
}

export function formatEventDate(value: Date | null | undefined): string | null {
  if (!value) return null
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}
