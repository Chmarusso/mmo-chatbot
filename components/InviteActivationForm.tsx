"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InviteActivationFormProps {
  ctaLabel?: string;
  onSuccessMessage?: string;
}

export function InviteActivationForm({
  ctaLabel = "Unlock access",
  onSuccessMessage = "Invite accepted. Reloading…",
}: InviteActivationFormProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inviteCode.trim();

    if (!trimmed) {
      toast.error("Enter the invite code that was shared with you.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode: trimmed }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !("profile" in payload)) {
        throw new Error(
          ("error" in payload && typeof payload.error === "string" && payload.error) ||
            "Could not apply invite code."
        );
      }

      toast.success(onSuccessMessage);
      setInviteCode("");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "We could not verify that invite. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
      <Input
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value)}
        placeholder="Enter your invite code"
        aria-label="Invite code"
        required
        className="sm:flex-1"
      />
      <Button type="submit" disabled={isSubmitting} className="sm:w-fit">
        {isSubmitting ? "Checking..." : ctaLabel}
      </Button>
    </form>
  );
}
