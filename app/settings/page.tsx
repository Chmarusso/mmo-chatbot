import type { Metadata } from "next";
import { SettingsPanel } from "@/components/SettingsPanel";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Settings | MMOPLAYA",
  description: "Manage your session, account preferences, and data export options on MMOPLAYA.",
};

export default async function SettingsPage() {
  const profile = await getOrCreateProfile();

  return (
    <main className="flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-4xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
      <header className="space-y-2 lg:text-left">
        <h1 className="text-3xl font-semibold lg:text-4xl">Settings</h1>
        <p className="text-sm text-gray-400 lg:text-base">
          Manage your session and control how we store your data.
        </p>
      </header>
      <div className="rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 lg:p-10">
        <SettingsPanel profile={profile} />
      </div>
    </main>
  );
}
