import { NextResponse } from "next/server";
import { fetchBrands } from "@/lib/fuel-api";

export const revalidate = 3600;

export async function GET() {
  try {
    const brands = await fetchBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand data" },
      { status: 500 }
    );
  }
}
