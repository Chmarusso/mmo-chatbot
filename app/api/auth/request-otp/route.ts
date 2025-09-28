import { NextResponse } from "next/server";
import { requestLoginOtp } from "@/lib/auth";

export async function POST(request: Request) {
  console.log("🚀 OTP Request received");
  
  const { email, redirect } = await request.json().catch(() => ({}));
  console.log("📧 Email received:", email);
  console.log("🔄 Redirect:", redirect);

  if (!email || typeof email !== "string") {
    console.log("❌ Invalid email provided");
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  try {
    console.log("📤 Calling requestLoginOtp...");
    await requestLoginOtp(email, redirect && typeof redirect === "string" ? redirect : undefined);
    console.log("✅ OTP request completed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to request OTP", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
