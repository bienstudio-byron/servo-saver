"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFuelStore } from "@/stores/fuel-store";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=au&q=${encodeURIComponent(q + ", Victoria")}&limit=5`,
      { headers: { "User-Agent": "PetrolSaver/1.0" } }
    )
      .then((r) => r.json())
      .then((data: SearchResult[]) => {
        setResults(data);
        setOpen(data.length > 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleSelect(result: SearchResult) {
    setFlyToTarget({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), zoom: 14 });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa0a6] z-10 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search suburb or area..."
        className="w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-3 py-1.5 text-sm text-white placeholder:text-[#5f6368] hover:border-white/20 focus:border-[#4285f4] focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-white/10 bg-[#242424] shadow-2xl overflow-hidden z-50">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 text-sm text-[#dadce0] hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-0 truncate"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
