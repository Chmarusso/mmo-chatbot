"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

export function SettingsPanel() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <div className="space-y-6 rounded-3xl border border-accent-purple/30 bg-surface/80 p-6">
      <div>
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
    </div>
  );
}
