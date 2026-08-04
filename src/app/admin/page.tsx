import Link from "next/link"
import {
  CalendarDays,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Ticket,
  Users,
} from "lucide-react"
import { count, desc, eq } from "drizzle-orm"
import { db } from "@/lib"
import { bookings, events, users } from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const access = await requireRole("ADMIN")

  if (access.status) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#090a0f] p-6 text-white">
        <ShieldCheck className="size-10 text-rose-400" />
        <h1 className="text-lg font-bold">Admin access required</h1>
        <p className="text-sm text-slate-400">
          {access.status === 401
            ? "Please sign in to view this dashboard."
            : "Only admins can view the organizer dashboard."}
        </p>
        <Link
          href="/"
          className="rounded-full bg-pink-500 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-pink-400"
        >
          Back to home
        </Link>
      </div>
    )
  }

  const [organizers, audiences, eventCount, bookingCount] = await Promise.all([
    db.select().from(users).where(eq(users.role, "ORGANIZER")).orderBy(desc(users.createdAt)),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, "AUDIENCE")),
    db.select({ value: count() }).from(events),
    db.select({ value: count() }).from(bookings),
  ])

  const stats = [
    { label: "Organizers", value: organizers.length, icon: Store, accent: "from-amber-400 to-orange-500" },
    { label: "Audience", value: audiences[0]?.value ?? 0, icon: Users, accent: "from-sky-400 to-blue-500" },
    { label: "Events listed", value: eventCount[0]?.value ?? 0, icon: CalendarDays, accent: "from-pink-400 to-rose-500" },
    { label: "Bookings", value: bookingCount[0]?.value ?? 0, icon: Ticket, accent: "from-emerald-400 to-teal-500" },
  ]

  return (
    <div className="min-h-screen bg-[#090a0f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10121a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg">
              <LayoutDashboard className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight">Admin Dashboard</h1>
              <p className="text-[11px] text-slate-400">Manage your platform&apos;s organizers</p>
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

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-[#16161d] p-5 ring-1 ring-white/5"
              >
                <div
                  className={`mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white shadow-lg`}
                >
                  <Icon className="size-5" />
                </div>
                <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                <p className="text-xs font-medium text-slate-400">{stat.label}</p>
              </div>
            )
          })}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">All Organizers</h2>
              <p className="text-xs text-slate-400">
                Every organizer registered on the platform
              </p>
            </div>
          </div>

          {organizers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#16161d] p-10 text-center">
              <Store className="mx-auto mb-3 size-8 text-slate-500" />
              <p className="text-sm font-semibold">No organizers yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Organizers appear here once they join and pick the Organizer account type.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161d]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 font-semibold">Organizer</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {organizers.map((organizer) => (
                    <tr
                      key={organizer.id}
                      className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[11px] font-black text-white">
                            {(organizer.firstName?.[0] ?? organizer.email[0] ?? "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {[organizer.firstName, organizer.lastName].filter(Boolean).join(" ") ||
                                "Organizer"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{organizer.email}</td>
                      <td className="hidden px-4 py-3 text-xs text-slate-400 sm:table-cell">
                        {formatDateTime(organizer.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
