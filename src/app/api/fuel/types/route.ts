import { NextResponse } from "next/server";
import { fetchFuelTypes } from "@/lib/fuel-api";

export const revalidate = 3600;

export async function GET() {
  try {
    const fuelTypes = await fetchFuelTypes();
    return NextResponse.json({ fuelTypes });
  } catch (error) {
    console.error("Failed to fetch fuel types:", error);
    return NextResponse.json(
      { error: "Failed to fetch fuel type data" },
      { status: 500 }
    );
  }
}
