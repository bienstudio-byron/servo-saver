import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { email, fuelType } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Add to Resend audience
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      return NextResponse.json({ error: "Audience not configured" }, { status: 500 });
    }

    await resend.contacts.create({
      audienceId,
      email,
      firstName: fuelType || "U91",
      unsubscribed: false,
    });

    // Send welcome email
    await resend.emails.send({
      from: "PetrolSaver <alerts@petrolsaver.live>",
      to: email,
      subject: "You're signed up for fuel price alerts!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #4285f4; border-radius: 8px; padding: 8px 12px;">
              <span style="color: white; font-weight: bold; font-size: 16px;">⚡ PetrolSaver</span>
            </div>
          </div>
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">You're in! 🎉</h2>
          <p style="color: #555; line-height: 1.6;">
            We'll notify you when <strong>${fuelType || "U91"}</strong> prices drop significantly in your area.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Price alerts are based on data from the Victorian Government's Fair Fuel API, updated every 24 hours.
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="https://petrolsaver.live" style="display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Check prices now →
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            Data from <a href="https://service.vic.gov.au" style="color: #4285f4;">Service Victoria</a> ·
            <a href="https://petrolsaver.live/how-it-works" style="color: #4285f4;">How it works</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert signup error:", error);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
