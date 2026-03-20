import { NextResponse } from "next/server";
import { Resend } from "resend";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Rate limiter: max 5 feedback per minute per IP
const feedbackTimes = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const times = feedbackTimes.get(ip) || [];
    const recent = times.filter((t) => now - t < RATE_WINDOW);
    if (recent.length >= RATE_LIMIT) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    recent.push(now);
    feedbackTimes.set(ip, recent);

    const { feedback } = await req.json();

    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      return NextResponse.json({ error: "Feedback is required" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "PetrolSaver <alerts@petrolsaver.live>",
      to: "petrolsaver.live@gmail.com",
      subject: "PetrolSaver User Feedback",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">New User Feedback</h2>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <p style="color: #333; line-height: 1.6; margin: 0; white-space: pre-wrap;">${esc(feedback.trim())}</p>
          </div>
          <p style="color: #999; font-size: 12px;">
            Submitted from PetrolSaver at ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
