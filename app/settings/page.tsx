import { SettingsPanel } from "@/components/SettingsPanel";
import { MobileNav } from "@/components/MobileNav";
import { DesktopNav } from "@/components/DesktopNav";

export default function SettingsPage() {
  return (
    <>
      <DesktopNav active="settings" />
      <main className="flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-4xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
        <header className="space-y-2 lg:text-left">
          <h1 className="text-3xl font-semibold lg:text-4xl">Settings</h1>
          <p className="text-sm text-gray-400 lg:text-base">
            Manage your session and control how we store your data.
          </p>
        </header>
        <div className="rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 shadow-glow lg:p-10">
          <SettingsPanel />
        </div>
      </main>
      <MobileNav active="settings" />
    </>
  );
}
