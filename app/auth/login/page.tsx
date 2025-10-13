import type { Metadata } from "next";
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Log in to MMOPLAYA</h1>
          <p className="text-sm text-text-secondary">
            Enter your email to receive a six-digit code or magic link. No passwords required.
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
    </main>
  );
}
