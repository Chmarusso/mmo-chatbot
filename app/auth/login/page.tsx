import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AuthForm } from "@/components/AuthForm";

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Log in | MMOPLAYA",
  description: "Sign in securely with a one-time code delivered to your inbox.",
};

const GREETINGS: Record<string, string> = {
  en: "Welcome back!",
  es: "¡Bienvenido de nuevo!",
  pt: "Bem-vindo de volta!",
  fr: "Bon retour !",
  de: "Willkommen zurück!",
  it: "Bentornato!",
  nl: "Welkom terug!",
  ru: "С возвращением!",
  ja: "おかえりなさい！",
  ko: "다시 오신 것을 환영해요!",
  "zh-cn": "欢迎回来！",
  "zh-tw": "歡迎回來！",
  tr: "Tekrar hoş geldin!",
  ar: "مرحبًا بعودتك!",
  hi: "वापसी पर स्वागत है!",
  bn: "ফিরে আসার জন্য স্বাগতম!",
  vi: "Chào mừng bạn trở lại!",
  id: "Selamat datang kembali!",
  pl: "Witamy ponownie!",
  sv: "Välkommen tillbaka!",
};

function getLocalizedGreeting(acceptLanguage: string | null): string {
  if (!acceptLanguage) {
    return GREETINGS.en;
  }

  const languages = acceptLanguage
    .split(",")
    .map((entry) => entry.trim().split(";")[0].toLowerCase());

  for (const language of languages) {
    const base = language.split("-")[0];
    if (GREETINGS[language]) {
      return GREETINGS[language];
    }
    if (GREETINGS[base]) {
      return GREETINGS[base];
    }
  }

  return GREETINGS.en;
}

const sanitizeRedirectParam = (redirect?: string) => {
  if (!redirect) return "dashboard";
  if (redirect.startsWith("/")) {
    return redirect === "/" ? "dashboard" : redirect;
  }
  return redirect;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;
  const redirectPath = sanitizeRedirectParam(params?.redirect);
  const headerList = await headers();
  const greeting = getLocalizedGreeting(headerList.get("accept-language"));

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Logo at top on mobile, centered on all screens */}
      <div className="flex justify-center px-6 pt-8 lg:pt-0">
        <Link href="/" aria-label="Go to MMOPLAYA home" className="lg:hidden">
          <img
            src="/mmoplaya-logo.png"
            alt="MMOPLAYA logo"
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* Main content centered */}
      <div className="flex flex-1 items-center justify-center px-6 pb-8 lg:pb-0">
        <section className="w-full max-w-md space-y-6">
          <header className="space-y-2 text-center">
            {/* Logo on desktop only */}
            <Link href="/" aria-label="Go to MMOPLAYA home" className="mb-4 hidden justify-center lg:flex">
              <img
                src="/mmoplaya-logo.png"
                alt="MMOPLAYA logo"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-xl font-medium text-accent-cyan">{greeting}</p>
            <p className="text-sm text-text-secondary">
              Enter your email to receive code or login link. <br/>No passwords required.
            </p>
            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                Something went wrong. Please request a new link.
              </p>
            )}
          </header>
          <div className="rounded-2xl border border-accent-purple/40 bg-surface/90 p-6 shadow-lg">
            <AuthForm redirectPath={redirectPath} />
          </div>
          <p className="text-center text-xs text-text-tertiary">
            Need help? Email{" "}
            <a className="text-accent-cyan transition hover:text-white" href="mailto:artur@mmoplaya.net">
              artur@mmoplaya.net
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
