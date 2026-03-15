"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { StationWithPrices } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import PriceBadge from "@/components/shared/PriceBadge";
import BrandLogo from "@/components/shared/BrandLogo";

interface StationTableProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  userLocation: { lat: number; lng: number } | null;
  onSelectStation?: (station: StationWithPrices) => void;
}

interface StationRow {
  id: string;
  name: string;
  brandName: string;
  suburb: string;
  price: number | null;
  updatedAt: string | null;
  distance: number | null;
}

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return "";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractSuburb(address: string): string {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 2) return parts[parts.length - 2];
  return address;
}

const columnHelper = createColumnHelper<StationRow>();

export default function StationTable({
  stations,
  selectedFuelType,
  userLocation,
  onSelectStation,
}: StationTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "price", desc: false },
  ]);

  const data = useMemo<StationRow[]>(() => {
    return stations.map((station) => {
      const fuelPrice = station.prices.find((p) => p.fuelType === selectedFuelType);
      const distance = userLocation
        ? haversineDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude)
        : null;
      return {
        id: station.id,
        name: station.name,
        brandName: station.brand?.name ?? "Unknown",
        suburb: extractSuburb(station.address),
        price: fuelPrice?.price ?? null,
        updatedAt: fuelPrice?.updatedAt ?? null,
        distance,
      };
    });
  }, [stations, selectedFuelType, userLocation]);

  const columns = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: any[] = [
      columnHelper.accessor("name", {
        header: "Station",
        cell: (info) => (
          <div className="flex items-center gap-3">
            <BrandLogo brandName={info.row.original.brandName} size="sm" />
            <div className="min-w-0">
              <div className="font-medium text-white truncate">{info.getValue()}</div>
              <div className="text-xs text-[#9aa0a6]">{info.row.original.brandName}</div>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("suburb", {
        header: "Suburb",
        cell: (info) => <span className="text-[#dadce0]">{info.getValue()}</span>,
      }),
      columnHelper.accessor("price", {
        header: "Price",
        cell: (info) => <PriceBadge price={info.getValue()} size="sm" />,
        sortUndefined: "last",
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.price;
          const b = rowB.original.price;
          if (a === null && b === null) return 0;
          if (a === null) return 1;
          if (b === null) return -1;
          return a - b;
        },
      }),
      columnHelper.accessor("updatedAt", {
        header: "Updated",
        cell: (info) => (
          <span className="text-[#9aa0a6] text-xs">
            {formatRelativeTime(info.getValue())}
          </span>
        ),
      }),
    ];

    if (userLocation) {
      cols.push(
        columnHelper.accessor("distance", {
          header: "Distance",
          cell: (info) => {
            const val = info.getValue();
            return val !== null ? (
              <span className="text-[#9aa0a6] text-sm font-mono">{val.toFixed(1)} km</span>
            ) : null;
          },
          sortUndefined: "last",
        })
      );
    }

    return cols;
  }, [userLocation]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#242424]/50">
      <table className="min-w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-white/10">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs
                    font-medium uppercase tracking-wider text-[#9aa0a6]
                    transition-colors hover:text-[#dadce0]"
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <span className="text-[#8ab4f8]">
                      {{ asc: "\u2191", desc: "\u2193" }[header.column.getIsSorted() as string] ?? ""}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => {
                const s = stations.find((st) => st.id === row.original.id);
                if (s && onSelectStation) onSelectStation(s);
                else router.push(`/station/${encodeURIComponent(row.original.id)}`);
              }}
              className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[#9aa0a6]">
                No stations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
