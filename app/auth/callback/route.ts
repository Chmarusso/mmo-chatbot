import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BlockedUserError, verifyOtpAndGetUser } from "@/lib/auth";
import { DisposableEmailError } from "@/lib/disposable-email";
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

  let user;
  try {
    user = await verifyOtpAndGetUser(email, code);
  } catch (error) {
    const responseUrl = new URL("/", baseUrl);
    if (error instanceof DisposableEmailError) {
      responseUrl.searchParams.set("error", "disposable_email");
    } else if (error instanceof BlockedUserError) {
      responseUrl.searchParams.set("error", "blocked");
    } else {
      responseUrl.searchParams.set("error", "invalid_code");
    }
    return NextResponse.redirect(responseUrl);
  }

  if (!user) {
    const responseUrl = new URL("/", baseUrl);
    responseUrl.searchParams.set("error", "invalid_code");
    return NextResponse.redirect(responseUrl);
  }

  await createSession(user.id);

  const responseUrl = new URL(redirectTo, baseUrl);
  return NextResponse.redirect(responseUrl);
}
