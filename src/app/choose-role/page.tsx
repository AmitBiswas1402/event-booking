"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import {
  ShoppingBag,
  Store,
  Check,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Ticket,
  CalendarPlus,
  BarChart3,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ChooseRolePage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [selectedRole, setSelectedRole] = useState<"AUDIENCE" | "ORGANIZER">("AUDIENCE")
  const [isCheckingUser, setIsCheckingUser] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !user) {
      window.location.href = "/"
      return
    }

    const checkDbUserStatus = async () => {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        if (res.ok) {
          const data = await res.json()

          if (data.role !== null && data.role !== undefined) {
            window.location.href = "/"
            return
          }
        }
      } catch (err) {
        console.error("Error checking user status on /choose-role:", err)
      } finally {
        setIsCheckingUser(false)
      }
    }

    checkDbUserStatus()
  }, [isLoaded, isSignedIn, user])

  const handleConfirmRole = async () => {
    if (!isSignedIn || !user) return
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save account role")
      }

      window.location.href = "/"
    } catch (err: unknown) {
      console.error("Onboarding role save failed:", err)
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to complete onboarding. Please try again."
      )
      setIsSubmitting(false)
    }
  }

  const roleOptions = [
    {
      id: "AUDIENCE" as const,
      title: "Audience Account",
      badge: "Book Tickets",
      icon: ShoppingBag,
      iconBg: "from-pink-500 to-rose-500",
      description: "Browse events, pick your seat and book tickets in seconds.",
      features: [
        { icon: Ticket, text: "Discover events near you" },
        { icon: ClipboardList, text: "Live seat selection & booking" },
        { icon: Sparkles, text: "Secure digital tickets & offers" },
      ],
    },
    {
      id: "ORGANIZER" as const,
      title: "Organizer Account",
      badge: "Event Planner",
      icon: Store,
      iconBg: "from-violet-500 to-indigo-500",
      description: "Create and manage events, set capacity and ticket prices.",
      features: [
        { icon: CalendarPlus, text: "Create & publish events" },
        { icon: Ticket, text: "Set ticket types & pricing" },
        { icon: BarChart3, text: "Track bookings & sales" },
      ],
    },
  ]

  if (!isLoaded || isCheckingUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090a0f] p-6 text-center">
        <Loader2 className="mb-3 size-8 animate-spin text-pink-500" />
        <p className="text-xs font-bold text-slate-400">
          Checking account credentials in database...
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#090a0f] text-white">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-pink-600/20 blur-[120px]" />
        <div className="absolute -right-32 -bottom-40 size-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(248,68,100,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Back */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-pink-300"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-9 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-400/20 bg-pink-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-pink-300">
            <Sparkles className="size-3.5" />
            <span>Welcome, {user?.firstName || "User"}!</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Choose your account{" "}
            <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
              type
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Pick how you want to use the platform — book tickets as an audience or create events as
            an organizer.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {roleOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedRole === opt.id

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedRole(opt.id)}
                className={`group relative flex flex-col items-start gap-5 rounded-2xl border p-6 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-pink-400/50 bg-white/[0.05] shadow-xl shadow-pink-950/20 ring-1 ring-pink-400/20"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <span className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-lg">
                    <Check className="size-3.5 stroke-3" />
                  </span>
                )}

                <div
                  className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${opt.iconBg} text-white shadow-lg transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className="size-7" />
                </div>

                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {opt.badge}
                  </span>
                  <h2 className="text-lg font-bold">{opt.title}</h2>
                  <p className="text-xs leading-relaxed text-slate-400">{opt.description}</p>

                  <ul className="space-y-2 pt-2">
                    {opt.features.map((feature) => {
                      const FeatureIcon = feature.icon
                      return (
                        <li key={feature.text} className="flex items-center gap-2.5">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                            <FeatureIcon className="size-3.5 text-pink-300" />
                          </span>
                          <span className="text-[11px] font-medium text-slate-300">
                            {feature.text}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </button>
            )
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* CTA */}
        <div className="mt-9">
          <Button
            onClick={handleConfirmRole}
            disabled={isSubmitting}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs font-bold text-white shadow-lg shadow-pink-950/30 transition-all duration-300 hover:from-pink-400 hover:to-violet-400 disabled:opacity-70"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving account type...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Continue as {selectedRole === "ORGANIZER" ? "Organizer" : "Audience"}
                <ArrowRight className="size-4" />
              </span>
            )}
          </Button>
          <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-slate-500">
            Free to join · Change anytime in your profile
          </p>
        </div>
      </div>
    </div>
  )
}
