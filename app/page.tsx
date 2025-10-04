import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

interface HomePageProps {
  searchParams: {
    redirect?: string;
    error?: string;
  };
}

export const revalidate = 0;

export const metadata: Metadata = {
  title: "MMO Match | Squad Up",
  description: "Request a magic link and join MMO Match to find your next raid party.",
};

const featureHighlights = [
  "Build a party-ready profile in minutes",
  "Match by MMO, schedule, language, and playstyle",
  "Chat instantly once both sides squad up",
];

export default function HomePage({ searchParams }: HomePageProps) {
  const redirectPath = searchParams?.redirect ?? "dashboard";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 lg:py-20">
      <section className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6 text-center lg:text-left">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent-purple">
              Find your perfect squad
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-5xl">
              Squad up on <span className="text-accent-cyan">MMO Match</span>
            </h1>
            <p className="text-sm text-gray-300 lg:text-base lg:max-w-xl">
              Drop your email to get a magic link. Build your profile, swipe through fellow adventurers, and party up instantly.
            </p>
          </div>
          <ul className="mx-auto flex max-w-sm flex-col gap-2 text-left text-sm text-gray-300 lg:mx-0 lg:text-base">
            {featureHighlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-accent-cyan" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full max-w-md justify-self-center space-y-6 rounded-3xl border border-accent-purple/30 bg-surface/80 p-8 text-center shadow-glow lg:justify-self-end lg:p-10">
          {searchParams?.error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              Something went wrong. Please request a new link.
            </p>
          ) : null}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white lg:text-3xl">
              Log in with a magic link
            </h2>
            <p className="text-sm text-gray-300">
              Enter your email to receive a secure code. No passwords required.
            </p>
          </div>
          <AuthForm redirectPath={redirectPath} />
          <p className="text-xs text-gray-400">
            We’ll email you a secure link—no passwords, no hassles. By continuing you agree to our
            <Link href="#" className="ml-1 underline">
              community guidelines
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
