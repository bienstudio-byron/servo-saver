"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/prices", label: "Prices by Suburb" },
  { href: "/how-it-works", label: "How It Works" },
];

export default function SubpageHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--subtle-border)] bg-[var(--card)]/90 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-[#4285f4] flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--accent-text)] transition-colors">PetrolSaver</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== "/prices" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`text-[11px] font-semibold transition-colors px-2 py-1 rounded-lg cursor-pointer ${
                  isActive
                    ? "text-[var(--foreground)] bg-[var(--subtle)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="text-[11px] font-bold bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors px-3 py-1.5 rounded-lg cursor-pointer ml-1"
          >
            Open Map
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          {menuOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--subtle-border)] bg-[var(--card)] px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== "/prices" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block text-sm font-medium transition-colors px-3 py-2 rounded-lg cursor-pointer ${
                  isActive
                    ? "text-[var(--foreground)] bg-[var(--subtle)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="block text-sm font-bold text-center bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors px-3 py-2.5 rounded-lg cursor-pointer mt-2"
          >
            Open Map
          </Link>
        </div>
      )}
    </div>
  );
}
