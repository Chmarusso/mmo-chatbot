import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { cookies } from "next/headers";
import { trackReferralVisit } from "@/lib/referral";
import {
  Gamepad2,
  Target,
  Lock,
  Zap,
  Trophy,
  Globe,
  Clock,
  Swords,
  Shield,
  Users,
  Gift,
} from "lucide-react";

interface HomePageProps {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
    ref?: string;
  }>;
}

export const revalidate = 0;

export const metadata: Metadata = {
  title: "MMOPLAYA | Find Your Perfect Gaming Squad",
  description: "Connect with gamers who share your games, language, playstyle, and schedule. Privacy-focused matchmaking with no ads or tracking.",
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const redirectPath = params?.redirect ?? "dashboard";
  const referralCode = params?.ref;

  // Handle referral tracking
  if (referralCode) {
    const cookieStore = await cookies();

    // Set referral cookie for 30 days
    cookieStore.set('mmo_ref', referralCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    // Track the referral visit
    trackReferralVisit(referralCode).catch(err =>
      console.error('Failed to track referral:', err)
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 w-full max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Column - Hero Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-purple/10 px-4 py-1.5 text-sm font-medium text-accent-purple">
                  <Gamepad2 size={16} />
                  Privacy-First Gaming Matchmaker
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white lg:text-6xl">
                  Find Your Perfect{" "}
                  <span className="bg-gradient-to-r from-accent-purple to-accent-cyan bg-clip-text text-transparent">
                    Gaming Squad
                  </span>
                </h1>
                <p className="text-lg text-text-secondary lg:text-xl max-w-2xl">
                  Connect with gamers who play the same games, speak your language, match your playstyle, and are online when you are.
                </p>
              </div>

              {/* Key Features Grid */}
              <div className="grid gap-4 sm:grid-cols-2 text-left">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/10">
                    <Target size={18} className="text-accent-purple" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Smart Matching</h3>
                    <p className="text-sm text-text-secondary">Game, language, playstyle & schedule</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <Lock size={18} className="text-accent-cyan" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Privacy First</h3>
                    <p className="text-sm text-text-secondary">No ads, no tracking, no BS</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/10">
                    <Zap size={18} className="text-accent-purple" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Instant Chat</h3>
                    <p className="text-sm text-text-secondary">Connect when you both swipe right</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <Trophy size={18} className="text-accent-cyan" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Earn & Level Up</h3>
                    <p className="text-sm text-text-secondary">Gain EXP, unlock achievements</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="w-full max-w-md justify-self-center lg:justify-self-end">
              <div className="space-y-6 rounded-3xl border border-accent-purple/30 bg-surface/80 p-8 lg:p-10">
                {params?.error && (
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    Something went wrong. Please request a new link.
                  </p>
                )}
                <div className="space-y-3 text-center">
                  <h2 className="text-2xl font-bold text-white lg:text-3xl">
                    Join the Squad
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Get a magic link via email. No passwords required.
                  </p>
                </div>
                <AuthForm redirectPath={redirectPath} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-white/5 px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white lg:text-4xl">How It Works</h2>
            <p className="mt-3 text-lg text-text-secondary">Three simple steps to find your squad</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative rounded-2xl border border-accent-purple/20 bg-surface/50 p-8 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/20 text-2xl font-bold text-accent-purple">
                1
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Create Your Profile</h3>
              <p className="text-text-secondary">
                Set your games, preferred language, playstyle, and when you&apos;re usually online
              </p>
            </div>

            <div className="relative rounded-2xl border border-accent-cyan/20 bg-surface/50 p-8 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-cyan/20 text-2xl font-bold text-accent-cyan">
                2
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Swipe & Match</h3>
              <p className="text-text-secondary">
                Browse profiles of gamers who match your preferences. Swipe right to connect
              </p>
            </div>

            <div className="relative rounded-2xl border border-accent-purple/20 bg-surface/50 p-8 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/20 text-2xl font-bold text-accent-purple">
                3
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Squad Up</h3>
              <p className="text-text-secondary">
                Chat instantly, join guilds, plan events, and dominate together
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Features Section */}
      <section className="border-t border-white/5 bg-gradient-to-b from-transparent to-accent-purple/5 px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white lg:text-4xl">Built for Gamers, by Gamers</h2>
            <p className="mt-3 text-lg text-text-secondary">Everything you need, nothing you don&apos;t</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-surface/30 p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/10">
                <Globe size={24} className="text-accent-purple" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Multi-Language Support</h3>
              <p className="text-sm text-text-secondary">
                Find players who speak your language for better communication
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface/30 p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-cyan/10">
                <Clock size={24} className="text-accent-cyan" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Time Zone Matching</h3>
              <p className="text-sm text-text-secondary">
                Connect with players who are online when you are
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface/30 p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/10">
                <Swords size={24} className="text-accent-purple" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Playstyle Filters</h3>
              <p className="text-sm text-text-secondary">
                Casual or hardcore? PvP or PvE? Find your perfect match
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface/30 p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-cyan/10">
                <Shield size={24} className="text-accent-cyan" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">No Tracking</h3>
              <p className="text-sm text-text-secondary">
                Zero analytics, zero ads, zero data selling. Your privacy matters
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface/30 p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/10">
                <Users size={24} className="text-accent-purple" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Guilds & Events</h3>
              <p className="text-sm text-text-secondary">
                Create or join guilds, organize raids and gaming sessions
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface/30 p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-cyan/10">
                <Gift size={24} className="text-accent-cyan" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Referral Rewards</h3>
              <p className="text-sm text-text-secondary">
                Invite friends, earn EXP, and level up together
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/5 px-6 py-16 text-center lg:py-20">
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-3xl font-bold text-white lg:text-5xl">
            Ready to Find Your Squad?
          </h2>
          <p className="text-lg text-text-secondary">
            Join thousands of gamers already squading up on MMOPLAYA
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#top"
              className="inline-flex items-center rounded-full bg-accent-purple px-8 py-3 text-base font-semibold text-white transition hover:bg-accent-purple/80"
            >
              Get Started Free
            </a>
            <Link
              href="/games"
              className="inline-flex items-center rounded-full border border-accent-purple/30 px-8 py-3 text-base font-semibold text-white transition hover:bg-accent-purple/10"
            >
              Browse Games
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
