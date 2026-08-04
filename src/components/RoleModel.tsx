"use client"

import { useState } from "react"
import { ShoppingBag, Store, Check, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  clerkId: string
  onRoleUpdated: (newRole: "AUDIENCE" | "ORGANIZER") => void
}

export default function RoleModal({
  isOpen,
  onClose,
  clerkId,
  onRoleUpdated,
}: RoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<"AUDIENCE" | "ORGANIZER">("AUDIENCE")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirmRole = async () => {
    setIsSubmitting(true)

    try {
      if (clerkId && clerkId !== "local-dev-user") {
        await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId,
            role: selectedRole,
          }),
        })
      }

      onRoleUpdated(selectedRole)
      onClose()
    } catch (error) {
      console.error("Failed to set onboarding role:", error)
      onRoleUpdated(selectedRole)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleOptions = [
    {
      id: "AUDIENCE" as const,
      title: "Customer Account (Buyer)",
      badge: "Shopper",
      icon: ShoppingBag,
      color: "from-blue-500 to-indigo-600",
      description: "Browse products, add items to cart, place orders, and manage your wishlist.",
    },
    {
      id: "ORGANIZER" as const,
      title: "Organizer Account",
      badge: "Event Planner",
      icon: Store,
      color: "from-amber-500 to-purple-600",
      description: "Create and manage events, set ticket prices, and access Organizer Dashboard.",
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-6 [&>button]:hidden">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <DialogTitle className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              Select Account Type
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Please choose whether you are joining as a Customer or an Organizer to set up your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {roleOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedRole === opt.id

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedRole(opt.id)}
                className={`relative flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${opt.color} text-white shadow-xs`}
                >
                  <Icon className="size-5" />
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {opt.title}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check className="size-3 stroke-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    {opt.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmRole}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 shadow-md"
          >
            {isSubmitting ? "Setting Up Account..." : "Confirm & Enter Store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
