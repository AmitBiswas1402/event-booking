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
      className="relative w-full overflow-hidden select-none py-2"
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
                  "relative w-[85vw] md:w-[1200px] aspect-[1200/300] shrink-0 rounded-xl md:rounded-2xl overflow-hidden cursor-pointer transition-all duration-500",
                  isActive
                    ? "opacity-100 scale-100 shadow-sm z-10"
                    : "opacity-65 scale-[0.96] hover:opacity-85"
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
              </div>
            )
          })}
        </div>
      </div>

      {/* Manual Control Arrows on Left and Right Edges */}
      <button
        onClick={prevSlide}
        className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 z-20 flex size-8 md:size-10 items-center justify-center rounded-r-lg bg-black/60 text-white hover:bg-black/80 transition-all cursor-pointer"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="size-5 md:size-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 z-20 flex size-8 md:size-10 items-center justify-center rounded-l-lg bg-black/60 text-white hover:bg-black/80 transition-all cursor-pointer"
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
              "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
              realActiveIndex === index
                ? "w-6 bg-gray-800 dark:bg-white"
                : "w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

