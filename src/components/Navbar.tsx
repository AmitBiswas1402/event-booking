"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "./Logo";
import Search from "./Search";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  ChevronDown,
  Menu,
  MapPin,
  X,
  Ticket,
  Gift,
  Tag,
  Building2,
  HelpCircle,
  Bell,
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
    <header className="w-full bg-white dark:bg-slate-900 shadow-xs border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 md:gap-8">
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-6 flex-1 max-w-4xl">
          <Logo />
          <div className="hidden sm:block flex-1">
            <Search />
          </div>
        </div>

        {/* Right: Location, Sign In / User & Hamburger Menu */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* City Location Selector */}
          <div className="relative" ref={cityDropdownRef}>
            <button
              onClick={() => setIsCityOpen(!isCityOpen)}
              className="flex items-center gap-1 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors py-1 cursor-pointer"
            >
              <span>{selectedCity}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isCityOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* City Dropdown Menu */}
            {isCityOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#f84464]" /> Select
                    City
                  </span>
                  <button
                    onClick={() => setIsCityOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
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
                      className={`text-left text-xs px-2.5 py-1.5 rounded transition-colors ${
                        selectedCity === city
                          ? "bg-[#f84464]/10 text-[#f84464] font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Authentication */}
          <div>
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button className="bg-[#f84464] hover:bg-[#e03756] text-white text-xs md:text-sm font-medium px-4 py-1.5 rounded cursor-pointer transition-colors shadow-2xs">
                  Sign in
                </button>
              </SignInButton>
            ) : (
              <UserButton />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar (Visible on mobile screens) */}
      <div className="sm:hidden px-4 pb-2">
        <Search />
      </div>

      {/* Secondary / Sub Navbar Header */}
      <div className="bg-[#f5f5f5] dark:bg-slate-950 border-t border-b border-gray-200 dark:border-gray-800 text-xs md:text-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center justify-between gap-15 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link href="#" className="hover:text-[#f84464] transition-colors">
            Movies
          </Link>
          <Link href="#" className="hover:text-[#f84464] transition-colors">
            Events
          </Link>
          <Link href="#" className="hover:text-[#f84464] transition-colors">
            Plays
          </Link>
          <Link href="#" className="hover:text-[#f84464] transition-colors">
            Sports
          </Link>
          <Link href="#" className="hover:text-[#f84464] transition-colors">
            Activities
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
