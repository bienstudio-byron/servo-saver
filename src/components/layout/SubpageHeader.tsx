"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/prices", label: "Prices by Suburb" },
  { href: "/how-it-works", label: "How It Works" },
];

export default function SubpageHeader() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 border-b border-white/5 bg-[#1a1a1a]/90 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-[#4285f4] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white group-hover:text-[#8ab4f8] transition-colors">PetrolSaver Victoria</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== "/prices" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`text-[11px] font-semibold transition-colors px-2 py-1 rounded-lg cursor-pointer ${
                  isActive
                    ? "text-white bg-white/10"
                    : "text-[#5f6368] hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="text-[11px] text-white font-bold bg-[#4285f4] hover:bg-[#5a9bf6] transition-colors px-3 py-1.5 rounded-lg cursor-pointer ml-1"
          >
            Open Map
          </Link>
        </nav>
      </div>
    </div>
  );
}
