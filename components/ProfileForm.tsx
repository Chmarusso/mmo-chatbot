"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Profile, GAME_OPTIONS, TIME_SLOTS, LANGUAGES, PLAYSTYLES } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/AvatarUploader";

interface ProfileFormProps {
  profile: Profile;
  onUpdated?: (profile: Profile) => void;
}

type FormState = {
  name: string;
  bio: string;
  twitterLink: string;
  redditLink: string;
  gamePref: string;
  timeSlot: string;
  language: string;
  playstyle: string;
};

export function ProfileForm({ profile, onUpdated }: ProfileFormProps) {
  const [formState, setFormState] = useState<FormState>({
    name: profile.name ?? "",
    bio: profile.bio ?? "",
    twitterLink: profile.twitterLink ?? "",
    redditLink: profile.redditLink ?? "",
    gamePref: profile.gamePref ?? "",
    timeSlot: profile.timeSlot ?? "",
    language: profile.language ?? "",
    playstyle: profile.playstyle ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);

  const handleChange = (key: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          bio: formState.bio.trim() || null,
          twitterLink: formState.twitterLink.trim() || null,
          redditLink: formState.redditLink.trim() || null,
          gamePref: formState.gamePref || null,
          timeSlot: formState.timeSlot || null,
          language: formState.language || null,
          playstyle: formState.playstyle || null,
          avatarUrl,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | { profile: Profile }
        | { error: string };

      if (!response.ok || !("profile" in data)) {
        throw new Error("error" in data ? data.error : "Failed to save profile");
      }

      toast.success("Profile saved!");
      if (onUpdated) {
        onUpdated(data.profile);
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not save profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-4">
        <AvatarUploader profile={profile} onUpload={setAvatarUrl} />
        <p className="text-xs text-gray-400">
          Upload a square image up to 2MB. We host avatars locally and serve them fast.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
            required
            maxLength={60}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formState.bio}
            onChange={(event) => handleChange("bio", event.target.value)}
            maxLength={200}
            placeholder="200 characters to tell party mates who you are."
          />
          <p className="text-xs text-gray-500 text-right">{formState.bio.length}/200</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              placeholder="@handle or url"
              value={formState.twitterLink}
              onChange={(event) => handleChange("twitterLink", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reddit">Reddit</Label>
            <Input
              id="reddit"
              placeholder="u/username"
              value={formState.redditLink}
              onChange={(event) => handleChange("redditLink", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Preferred MMO</Label>
          <Select
            value={formState.gamePref || undefined}
            onValueChange={(value) => handleChange("gamePref", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              {GAME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Time Slot (UTC)</Label>
            <Select
              value={formState.timeSlot || undefined}
              onValueChange={(value) => handleChange("timeSlot", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={formState.language || undefined}
              onValueChange={(value) => handleChange("language", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Playstyle</Label>
          <Select
            value={formState.playstyle || undefined}
            onValueChange={(value) => handleChange("playstyle", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a playstyle" />
            </SelectTrigger>
            <SelectContent>
              {PLAYSTYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
