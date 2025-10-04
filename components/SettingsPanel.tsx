"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/profile";

interface SettingsPanelProps {
  profile: Profile;
}

export function SettingsPanel({ profile }: SettingsPanelProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [theme, setTheme] = useState(profile.theme || "system");
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [notifyOnNewMatch, setNotifyOnNewMatch] = useState(profile.notifyOnNewMatch);
  const [notifyOnNewMessage, setNotifyOnNewMessage] = useState(profile.notifyOnNewMessage);
  const [notifyOnAnnouncements, setNotifyOnAnnouncements] = useState(profile.notifyOnAnnouncements);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  const handleSignOut = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to sign out");
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to sign out");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete your account data? This cannot be undone.")) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete account");
      }

      toast.success("Account data removed");
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Account deletion failed"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleThemeUpdate = async (newTheme: string) => {
    setTheme(newTheme);
    setIsUpdatingTheme(true);

    // Update localStorage immediately for instant UI change
    localStorage.setItem('theme', newTheme);

    // Dispatch custom event to notify ThemeProvider
    window.dispatchEvent(new CustomEvent('themeChange', { detail: newTheme }));

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to update theme");
      }

      toast.success("Theme updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update theme");
      setTheme(profile.theme || "system");
      localStorage.setItem('theme', profile.theme || "system");
      window.dispatchEvent(new CustomEvent('themeChange', { detail: profile.theme || "system" }));
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  const handleNotificationsUpdate = async () => {
    setIsUpdatingNotifications(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyOnNewMatch,
          notifyOnNewMessage,
          notifyOnAnnouncements,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to update notifications");
      }

      toast.success("Notification preferences updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update notifications");
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-accent-purple/30 bg-surface/80 p-6">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-gray-400">
          Choose how MMO Match looks on your device.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => handleThemeUpdate("light")}
            disabled={isUpdatingTheme}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              theme === "light"
                ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                : "border-gray-600 text-gray-400 hover:border-gray-500"
            }`}
          >
            Light
          </button>
          <button
            onClick={() => handleThemeUpdate("dark")}
            disabled={isUpdatingTheme}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              theme === "dark"
                ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                : "border-gray-600 text-gray-400 hover:border-gray-500"
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => handleThemeUpdate("system")}
            disabled={isUpdatingTheme}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              theme === "system"
                ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                : "border-gray-600 text-gray-400 hover:border-gray-500"
            }`}
          >
            System
          </button>
        </div>
      </div>
      <div className="border-t border-accent-cyan/10 pt-6">
        <h2 className="text-lg font-semibold">Session</h2>
        <p className="text-sm text-gray-400">
          Sign out of MMO Match on this device.
        </p>
        <Button className="mt-4" onClick={handleSignOut} disabled={isProcessing}>
          Sign out
        </Button>
      </div>
      <div className="border-t border-accent-cyan/10 pt-6">
        <h2 className="text-lg font-semibold text-red-300">Danger zone</h2>
        <p className="text-sm text-gray-400">
          Remove your profile, matches, swipes, and messages. You can always come back with a new magic link.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={handleDelete}
          disabled={isProcessing}
        >
          Delete account data
        </Button>
      </div>
      <div className="border-t border-accent-cyan/10 pt-6">
        <h2 className="text-lg font-semibold">Feedback</h2>
        <p className="text-sm text-gray-400">
          Found a bug or have an idea? Send it our way so we can improve MMO Match.
        </p>
        <div className="mt-4">
          <Link href="/feedback" className="text-accent-cyan transition hover:text-accent-purple">
            Submit feedback
          </Link>
        </div>
      </div>
      <div className="border-t border-accent-cyan/10 pt-6">
        <h2 className="text-lg font-semibold">Legal</h2>
        <p className="text-sm text-gray-400">
          Review the latest policies that keep MMO Match safe and fun for everyone.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Link href="/terms-of-use" className="text-accent-cyan transition hover:text-accent-purple">
            Terms of Use
          </Link>
          <Link href="/privacy-policy" className="text-accent-cyan transition hover:text-accent-purple">
            Privacy Policy
          </Link>
        </div>
      </div>
      <div className="border-t border-accent-cyan/10 pt-6">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-gray-400">
          Control when and how we notify you about activity on MMO Match.
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">New match notifications</span>
            <input
              type="checkbox"
              checked={notifyOnNewMatch}
              onChange={(e) => setNotifyOnNewMatch(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-surface text-accent-cyan focus:ring-accent-cyan"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">New message notifications</span>
            <input
              type="checkbox"
              checked={notifyOnNewMessage}
              onChange={(e) => setNotifyOnNewMessage(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-surface text-accent-cyan focus:ring-accent-cyan"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Announcement notifications</span>
            <input
              type="checkbox"
              checked={notifyOnAnnouncements}
              onChange={(e) => setNotifyOnAnnouncements(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-surface text-accent-cyan focus:ring-accent-cyan"
            />
          </label>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleNotificationsUpdate}
            disabled={isUpdatingNotifications}
          >
            {isUpdatingNotifications ? "Saving..." : "Save preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
