"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import type { Profile } from "@/types/profile";
import { Button } from "@/components/ui/button";

const PLACEHOLDER = "/avatar-placeholder.svg";

interface AvatarUploaderProps {
  profile: Profile;
  onUpload: (url: string | null) => void;
}

export function AvatarUploader({ profile, onUpload }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(profile.avatarUrl ?? PLACEHOLDER);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please upload an image smaller than 2MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { url: string }
        | { error: string };

      if (!response.ok || !("url" in payload)) {
        throw new Error("error" in payload ? payload.error : "Upload failed");
      }

      const urlWithCacheBust = `${payload.url}?t=${Date.now()}`;
      setPreviewUrl(urlWithCacheBust);
      onUpload(payload.url);
      toast.success("Avatar updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 lg:gap-4">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-accent-cyan/40 shadow-glow lg:h-32 lg:w-32">
        <Image
          src={previewUrl || PLACEHOLDER}
          alt={profile.name}
          width={128}
          height={128}
          className="h-full w-full object-cover"
          unoptimized
          key={previewUrl || 'placeholder'}
        />
      </div>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-5"
      >
        {uploading ? "Uploading..." : "Upload Avatar"}
      </Button>
    </div>
  );
}
