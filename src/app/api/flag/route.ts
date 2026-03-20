import { NextResponse } from "next/server";
import { Resend } from "resend";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Simple rate limiter: max 10 flags per minute per IP
const flagTimes = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const times = flagTimes.get(ip) || [];
    const recent = times.filter((t) => now - t < RATE_WINDOW);
    if (recent.length >= RATE_LIMIT) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    recent.push(now);
    flagTimes.set(ip, recent);

    const { stationName, stationId, reason } = await req.json();

    if (!stationName || !stationId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "PetrolSaver <alerts@petrolsaver.live>",
      to: "petrolsaver.live@gmail.com",
      subject: `🚩 ${esc(reason || "Flagged")}: ${esc(stationName)}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; padding: 20px;">
          <h2>Station Flagged</h2>
          <p><strong>Station:</strong> ${esc(stationName)}</p>
          <p><strong>ID:</strong> <code>${esc(stationId)}</code></p>
          <p><strong>Reason:</strong> ${esc(reason || "Not specified")}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Flag error:", error);
    return NextResponse.json({ success: true }); // Don't block the user
  }
}
