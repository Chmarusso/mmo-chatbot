import { Suspense } from "react";
import type { Metadata } from "next";
import { getOrCreateProfile } from "@/lib/profile";
import { ProfilePageClient } from "@/components/ProfilePageClient";

export const metadata: Metadata = {
  title: "Your Pilot Card | MMO Match",
  description: "Update your MMO Match profile, avatar, schedule, and language to attract the ideal squad.",
};

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();

  return (
    <main className="flex-1 space-y-8 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-7xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
      <header className="space-y-2 lg:text-left">
        <h1 className="text-3xl font-semibold lg:text-4xl">Your Pilot Card</h1>
        <p className="text-sm text-gray-400 lg:max-w-2xl lg:text-base">
          Tune your profile so the perfect raid party can find you. We only show your email to you.
        </p>
      </header>
      <Suspense fallback={<p>Loading...</p>}>
        <ProfilePageClient profile={profile} />
      </Suspense>
    </main>
  );
}
