import type { Metadata } from "next";
import { InviteActivationForm } from "@/components/InviteActivationForm";
import { getOrCreateProfile } from "@/lib/profile";
import { AiCompanion } from "@/components/AiCompanion";

export const metadata: Metadata = {
  title: "AI Companion | MMOPLAYA",
  description: "Chat with the MMOPLAYA AI companion for raid prep, build tips, and squad planning.",
};

export default async function CompanionPage() {
  const profile = await getOrCreateProfile();

  if (!profile.inviteCode?.trim()) {
    return (
      <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-2xl lg:px-12 lg:py-12 lg:pb-12">
        <div className="rounded-3xl border border-accent-purple/30 bg-surface/80 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-semibold">Invite required</h1>
          <p className="mt-3 text-sm text-gray-400">
            The MMOPLAYA companion is invite-only right now. Activate your invite to chat with the AI support crew.
          </p>
          <InviteActivationForm
            ctaLabel="Unlock companion"
            onSuccessMessage="Invite accepted! Companion unlocked."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden px-4 py-4 pb-24 sm:h-[calc(100vh-4rem)] sm:px-6 sm:pb-8 lg:mx-auto lg:max-w-7xl lg:h-[calc(100vh-5rem)] lg:px-8 lg:py-6 lg:pb-6">
      <AiCompanion />
    </main>
  );
}
