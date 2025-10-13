import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyOtpAndGetUser } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { resolveAppBaseUrl } from "@/lib/url";

const sanitizeRedirect = (redirectParam: string | null) => {
  if (!redirectParam) return "/dashboard";
  if (!redirectParam.startsWith("/")) return `/${redirectParam}`;
  return redirectParam === "/" ? "/dashboard" : redirectParam;
};

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const baseUrl = resolveAppBaseUrl(process.env.APP_URL, requestUrl.origin);
  const email = requestUrl.searchParams.get("email");
  const code = requestUrl.searchParams.get("code");
  const redirectTo = sanitizeRedirect(requestUrl.searchParams.get("redirect"));

  if (!email || !code) {
    const responseUrl = new URL("/", baseUrl);
    responseUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(responseUrl);
  }

  const user = await verifyOtpAndGetUser(email, code);

  if (!user) {
    const responseUrl = new URL("/", baseUrl);
    responseUrl.searchParams.set("error", "invalid_code");
    return NextResponse.redirect(responseUrl);
  }

  await createSession(user.id);

  const responseUrl = new URL(redirectTo, baseUrl);
  return NextResponse.redirect(responseUrl);
}
