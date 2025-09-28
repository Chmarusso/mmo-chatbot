"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface Invite {
  id: string;
  guildId: string;
  code: string;
  expiresAt: string;
  createdAt: string;
  createdById: string | null;
  status: "active" | "expired";
}

interface GuildInviteManagerProps {
  guildId: string;
  guildName: string;
  canCreate: boolean;
}

export function GuildInviteManager({ guildId, guildName, canCreate }: GuildInviteManagerProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const activeInvite = useMemo(
    () => invites.find((invite) => invite.status === "active"),
    [invites]
  );

  const inviteUrl = useMemo(() => {
    if (!activeInvite) return null;
    const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    if (!base) return null;
    return `${base}/guilds/invite/${activeInvite.code}`;
  }, [activeInvite, origin]);

  const refreshInvites = useCallback(async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/invites`);
      if (!response.ok) {
        throw new Error("Failed to load invites");
      }
      const payload = (await response.json()) as { invites: Invite[] };
      setInvites(payload.invites ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Could not fetch invites");
    }
  }, [guildId]);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : null);
    refreshInvites();
  }, [refreshInvites]);

  const handleCreateInvite = async () => {
    if (!canCreate) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/guilds/${guildId}/invites`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create invite");
      }
      toast.success("Invite created");
      await refreshInvites();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to create invite");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 shadow-glow lg:p-10">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold lg:text-2xl">QR invite</h2>
          <p className="text-sm text-gray-400 lg:text-base">
            Generate a one-hour invite that cameras can scan to join {guildName}. Members can set a guild nickname during onboarding.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleCreateInvite}
          disabled={!canCreate || isLoading}
          className="w-full lg:w-auto"
        >
          {isLoading ? "Creating..." : "Create new invite"}
        </Button>
      </div>

      {activeInvite ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-accent-cyan/20 bg-surface/60 p-6 text-center lg:flex-row lg:items-start lg:gap-8 lg:p-8 lg:text-left">
          <div className="flex h-48 w-48 items-center justify-center rounded-3xl border border-dashed border-accent-cyan/30 bg-accent-cyan/10 text-xs uppercase tracking-[0.2em] text-accent-cyan">
            Scan-friendly link
          </div>
          <div className="space-y-3 text-sm text-gray-300 lg:text-base">
            <p>
              Share this link: {" "}
              <span className="break-all text-accent-cyan">{inviteUrl}</span>
            </p>
            <p>
              Expires at {new Date(activeInvite.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-gray-400">
              Want a QR image? Drop this link into any QR generator (e.g., your phone camera or a trusted tool) and share the code.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!inviteUrl) return;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Link copied"));
                } else {
                  toast.error("Clipboard unavailable on this device");
                }
              }}
            >
              Copy link
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-accent-cyan/20 bg-surface/60 p-6 text-center">
          <p className="text-sm text-gray-300 lg:text-base">
            No active QR invites. {canCreate ? "Create one to share access instantly." : "Only officers or owners can generate invites."}
          </p>
        </div>
      )}
    </section>
  );
}
