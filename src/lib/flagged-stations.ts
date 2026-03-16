const STORAGE_KEY = "petrolsaver-flagged-stations";

export function getFlaggedStations(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function flagStation(stationId: string): void {
  const flagged = getFlaggedStations();
  flagged.add(stationId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...flagged]));
}

export function unflagStation(stationId: string): void {
  const flagged = getFlaggedStations();
  flagged.delete(stationId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...flagged]));
}

export function isStationFlagged(stationId: string): boolean {
  return getFlaggedStations().has(stationId);
}
