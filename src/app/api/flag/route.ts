import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { stationName, stationId, reason } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "PetrolSaver <alerts@petrolsaver.live>",
      to: "petrolsaver.live@gmail.com",
      subject: `🚩 Station flagged: ${stationName}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; padding: 20px;">
          <h2>Station Flagged</h2>
          <p><strong>Station:</strong> ${stationName}</p>
          <p><strong>ID:</strong> <code>${stationId}</code></p>
          <p><strong>Reason:</strong> ${reason || "Not specified"}</p>
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
