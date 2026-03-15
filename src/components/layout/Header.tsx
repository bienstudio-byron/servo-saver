"use client";

import Link from "next/link";
import HeaderSearch from "./HeaderSearch";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#1a1a1a]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-3 gap-3">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="h-7 w-7 rounded-md bg-[#4285f4] flex items-center justify-center shadow-lg shadow-[#4285f4]/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-white group-hover:text-[#8ab4f8] transition-colors hidden sm:inline">
            PetrolSaver
          </span>
        </Link>

        <div className="w-64 md:w-80">
          <HeaderSearch />
        </div>
      </div>
    </header>
  );
}
