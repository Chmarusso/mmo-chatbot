import { NextResponse } from "next/server";
import { BlockedUserError, requestLoginOtp } from "@/lib/auth";
import { DisposableEmailError } from "@/lib/disposable-email";

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
    if (error instanceof DisposableEmailError) {
      console.warn("🚫 Disposable email blocked:", email);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof BlockedUserError) {
      console.warn("⛔ Blocked account attempted OTP request:", email);
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("❌ Failed to request OTP", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
