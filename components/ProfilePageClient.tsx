"use client";

import { useState } from "react";
import type { Profile } from "@/types/profile";
import { ProfileForm } from "@/components/ProfileForm";
import { ProfilePreview } from "@/components/ProfilePreview";

interface ProfilePageClientProps {
  profile: Profile;
}

export function ProfilePageClient({ profile: initialProfile }: ProfilePageClientProps) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 lg:p-10">
        <ProfileForm profile={profile} onUpdated={setProfile} />
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <h3 className="mb-4 text-lg font-medium text-gray-300">Preview</h3>
          <ProfilePreview profile={profile} />
        </div>
      </div>
    </div>
  );
}
