import { NextResponse } from "next/server";
import { fetchMergedStations } from "@/lib/fuel-api";

export const revalidate = 3600;

export async function GET() {
  try {
    const stations = await fetchMergedStations();
    return NextResponse.json({ stations });
  } catch (error) {
    console.error("Failed to fetch stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch fuel data" },
      { status: 500 }
    );
  }
}
