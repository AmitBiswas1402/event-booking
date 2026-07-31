"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "./Logo";
import Search from "./Search";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  ChevronDown,
  MapPin,
  X,
} from "lucide-react";

const CITIES = [
  "Kolkata",
  "Mumbai",
  "Delhi-NCR",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Chandigarh",
  "Chennai",
  "Pune",
  "Kochi",
];

const Navbar = () => {
  const { isSignedIn } = useUser();
  const [selectedCity, setSelectedCity] = useState("Kolkata");
  const [isCityOpen, setIsCityOpen] = useState(false);

  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#10121a]/92 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:gap-8 md:px-8">
        <div className="flex flex-1 items-center gap-6">
          <Logo />
          <div className="hidden flex-1 sm:block">
            <Search />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="relative" ref={cityDropdownRef}>
            <button
              onClick={() => setIsCityOpen(!isCityOpen)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-pink-400/50 hover:text-white md:text-sm"
            >
              <MapPin className="size-3.5 text-pink-300" />
              <span>{selectedCity}</span>
              <ChevronDown
                className={`size-3.5 text-slate-400 transition-transform ${isCityOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCityOpen && (
              <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#171923] p-3 shadow-2xl shadow-black/40 duration-150">
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <MapPin className="size-3.5 text-pink-400" /> Select city
                  </span>
                  <button
                    onClick={() => setIsCityOpen(false)}
                    className="rounded-full p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close city menu"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto">
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setIsCityOpen(false);
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                        selectedCity === city
                          ? "bg-pink-500/15 font-semibold text-pink-200"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button className="cursor-pointer rounded-full bg-pink-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-950/30 transition-colors hover:bg-pink-400 md:text-sm">
                  Sign in
                </button>
              </SignInButton>
            ) : (
              <UserButton />
            )}
          </div>
        </div>
      </div>

      <div className="sm:hidden px-4 pb-2">
        <Search />
      </div>

      <div className="border-t border-white/8 bg-[#0b0c12]/80 text-xs md:text-sm">
        <nav className="mx-auto flex max-w-7xl items-center gap-8 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-slate-400 md:px-8">
          <Link href="#" className="transition-colors hover:text-pink-300">
            Movies
          </Link>
          <Link href="#" className="transition-colors hover:text-pink-300">
            Events
          </Link>
          <Link href="#" className="transition-colors hover:text-pink-300">
            Plays
          </Link>
          <Link href="#" className="transition-colors hover:text-pink-300">
            Sports
          </Link>
          <Link href="#" className="transition-colors hover:text-pink-300">
            Activities
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
