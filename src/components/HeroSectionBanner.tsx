"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { heroSec } from "@/lib/HeroSection"

// Create extended slides array for seamless infinite looping flow
const extendedSlides = [
  { ...heroSec[heroSec.length - 1], uniqueId: "clone-prev-last" },
  ...heroSec.map((item) => ({ ...item, uniqueId: `real-${item.id}` })),
  { ...heroSec[0], uniqueId: "clone-next-first" },
]

export default function HeroSectionBanners() {
  // Start at index 1 (the first real slide in extendedSlides)
  const [currentIndex, setCurrentIndex] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const realSlidesCount = heroSec.length

  // Handle window resize to accurately calculate exact centering offsets
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Calculate actual active slide index (0 to realSlidesCount - 1) for pagination dots
  const realActiveIndex = (currentIndex - 1 + realSlidesCount) % realSlidesCount

  const nextSlide = () => {
    if (!isTransitioning) return
    setCurrentIndex((prev) => prev + 1)
  }

  const prevSlide = () => {
    if (!isTransitioning) return
    setCurrentIndex((prev) => prev - 1)
  }

  const goToSlide = (realIndex: number) => {
    if (!isTransitioning) return
    setCurrentIndex(realIndex + 1)
  }

  // Seamless jump handler when reaching clone boundaries
  useEffect(() => {
    if (currentIndex === extendedSlides.length - 1) {
      // Reached clone of first slide (at end)
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(1) // Jump silently to real first slide
      }, 600)
      return () => clearTimeout(timer)
    }

    if (currentIndex === 0) {
      // Reached clone of last slide (at start)
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(realSlidesCount) // Jump silently to real last slide
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, realSlidesCount])

  // Re-enable transition after silent reset
  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning])

  // Automatic continuous flow timer (advances every 3.5 seconds)
  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => prev + 1)
    }, 3500)

    return () => clearInterval(timer)
  }, [isPaused])

  // Exact transform calculation ensuring active banner is 100% dead-centered
  // Desktop: slide width = 1200px, gap = 16px -> center offset = 50% - 600px - (currentIndex * 1216px)
  // Mobile: slide width = 85vw, gap = 12px -> center offset = 7.5vw - (currentIndex * (85vw + 12px))
  const transformStyle = isDesktop
    ? `translateX(calc(50% - 600px - ${currentIndex} * 1216px))`
    : `translateX(calc(7.5vw - ${currentIndex} * (85vw + 12px)))`

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full select-none overflow-hidden py-2"
    >
      {/* Carousel Track with Left and Right Peeking Banner Previews */}
      <div className="w-full flex items-center overflow-hidden">
        <div
          className={cn(
            "flex gap-3 md:gap-4 w-full",
            isTransitioning ? "transition-transform duration-600 ease-in-out" : "transition-none"
          )}
          style={{
            transform: transformStyle,
          }}
        >
          {extendedSlides.map((banner, index) => {
            const isActive = index === currentIndex
            return (
              <div
                key={`${banner.uniqueId}-${index}`}
                onClick={() => {
                  const targetRealIndex = (banner.id - 1) % realSlidesCount
                  goToSlide(targetRealIndex)
                }}
                className={cn(
                  "relative aspect-[1200/300] w-[86vw] shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-white/10 transition-all duration-500 md:w-[1200px] md:rounded-2xl",
                  isActive
                    ? "z-10 scale-100 opacity-100 shadow-2xl shadow-black/35"
                    : "scale-[0.96] opacity-55 hover:opacity-80"
                )}
              >
                <Image
                  src={banner.image}
                  alt={banner.category || banner.title || ""}
                  fill
                  sizes="(max-width: 768px) 85vw, 1200px"
                  className="object-cover"
                  priority={index === 1}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Manual Control Arrows on Left and Right Edges */}
      <button
        onClick={prevSlide}
        className="absolute left-1 top-1/2 z-20 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur transition-all hover:bg-pink-500 md:left-4 md:size-10"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="size-5 md:size-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-1 top-1/2 z-20 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur transition-all hover:bg-pink-500 md:right-4 md:size-10"
        aria-label="Next Slide"
      >
        <ChevronRight className="size-5 md:size-6" />
      </button>

      {/* Navigation Dots (Pagination) */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        {heroSec.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "h-1.5 cursor-pointer rounded-full transition-all duration-300",
              realActiveIndex === index
                ? "w-7 bg-pink-400"
                : "w-1.5 bg-white/25 hover:bg-white/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}


