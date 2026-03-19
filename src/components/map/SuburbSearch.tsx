"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMap } from "react-leaflet";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function SuburbSearch() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
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
    map.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 14, { duration: 1 });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Prevent map zoom/pan when interacting with search
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop);
    el.addEventListener("mousedown", stop);
    el.addEventListener("dblclick", stop);
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("mousedown", stop);
      el.removeEventListener("dblclick", stop);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-3 right-14 z-[1000] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[340px]"
    >
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8ab4f8] z-10 pointer-events-none"
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
          className="w-full rounded-2xl border border-white/15 bg-[#2a2a2a]/95 backdrop-blur-xl pl-11 pr-4 py-2.5 text-sm text-white shadow-2xl placeholder:text-[#9aa0a6] hover:border-white/25 focus:border-[#4285f4] focus:outline-none focus:ring-2 focus:ring-[#4285f4]/20"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="mt-1.5 rounded-xl border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 text-sm text-[#dadce0] hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 truncate"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
