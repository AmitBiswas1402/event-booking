import EventDetailPage from "@/components/EventDetailPage"

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <EventDetailPage slug={slug} />
}
