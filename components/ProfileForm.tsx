"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Profile, GAME_OPTIONS, TIME_SLOTS, LANGUAGES, PLAYSTYLES } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/AvatarUploader";
import { cn } from "@/lib/utils";

const BROWSER_LANGUAGE_MAP: Record<string, string> = {
  en: "english",
  es: "spanish",
  fr: "french",
  de: "german",
  pt: "portuguese",
  ru: "russian",
  zh: "chinese",
  pl: "polish",
};

interface ProfileFormProps {
  profile: Profile;
  onUpdated?: (profile: Profile) => void;
}

type FormState = {
  name: string;
  bio: string;
  gamePref: string;
  timeSlot: string;
  timeSlots: string[];
  language: string;
  playstyle: string;
  notifyOnNewMatch: boolean;
  notifyOnNewMessage: boolean;
  notifyOnAnnouncements: boolean;
};

const STEP_COUNT = 3;

export function ProfileForm({ profile, onUpdated }: ProfileFormProps) {
  const initialTimeSlots = Array.from(
    new Set(
      profile.timeSlots && profile.timeSlots.length > 0
        ? profile.timeSlots
        : profile.timeSlot
        ? [profile.timeSlot]
        : []
    )
  );
  const [formState, setFormState] = useState<FormState>({
    name: profile.name ?? "",
    bio: profile.bio ?? "",
    gamePref: profile.gamePref ?? "",
    timeSlot: initialTimeSlots[0] ?? "",
    timeSlots: initialTimeSlots,
    language: profile.language ?? "",
    playstyle: profile.playstyle ?? "",
    notifyOnNewMatch: profile.notifyOnNewMatch ?? true,
    notifyOnNewMessage: profile.notifyOnNewMessage ?? true,
    notifyOnAnnouncements: profile.notifyOnAnnouncements ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);
  const [step, setStep] = useState(0);

  const handleAvatarUpload = (url: string | null) => {
    setAvatarUrl(url);
    if (onUpdated) {
      onUpdated({ ...profile, avatarUrl: url });
    }
  };
  const [gameSearch, setGameSearch] = useState("");
  const sortedGames = useMemo(
    () => [...GAME_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );
  const filteredGames = useMemo(() => {
    const query = gameSearch.trim().toLowerCase();
    if (!query) return sortedGames;
    return sortedGames.filter((option) => option.label.toLowerCase().includes(query));
  }, [sortedGames, gameSearch]);

  useEffect(() => {
    if (profile.language || formState.language) {
      return;
    }

    try {
      const navigatorLanguages = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
      for (const locale of navigatorLanguages) {
        if (!locale) continue;
        const languageCode = locale.toLowerCase().split("-")[0];
        const mappedLanguage = languageCode ? BROWSER_LANGUAGE_MAP[languageCode] : undefined;
        if (mappedLanguage) {
          setFormState((prev) => ({ ...prev, language: mappedLanguage }));
          break;
        }
      }
    } catch (error) {
      console.error("Could not detect browser language", error);
    }
  }, [profile.language, formState.language]);

  const timeZoneLabel = useMemo(() => {
    try {
      const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
      const offsetMinutes = new Date().getTimezoneOffset();
      const sign = offsetMinutes <= 0 ? "+" : "-";
      const absoluteMinutes = Math.abs(offsetMinutes);
      const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
      const minutes = String(absoluteMinutes % 60).padStart(2, "0");
      const offset = `${sign}${hours}:${minutes}`;
      return timeZone ? `${timeZone} (UTC${offset})` : `UTC${offset}`;
    } catch (error) {
      console.error("Could not resolve user timezone", error);
      return null;
    }
  }, []);

  const isFinalStep = step === STEP_COUNT - 1;

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTimeSlot = (value: string) => {
    setFormState((prev) => {
      const exists = prev.timeSlots.includes(value);
      const nextTimeSlots = exists
        ? prev.timeSlots.filter((slot) => slot !== value)
        : [...prev.timeSlots, value];
      return {
        ...prev,
        timeSlots: nextTimeSlots,
        timeSlot: nextTimeSlots[0] ?? "",
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFinalStep) {
      if (step === 0 && (!formState.gamePref || !formState.playstyle)) {
        toast.error("Pick your MMO and playstyle to continue.");
        return;
      }
      if (step === 1 && (formState.timeSlots.length === 0 || !formState.language)) {
        toast.error("Select at least one time slot and language.");
        return;
      }
      setStep((prev) => Math.min(prev + 1, STEP_COUNT - 1));
      return;
    }

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

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
          gamePref: formState.gamePref || null,
          timeSlot: formState.timeSlot || null,
          timeSlots: formState.timeSlots,
          language: formState.language || null,
          playstyle: formState.playstyle || null,
          avatarUrl,
          notifyOnNewMatch: formState.notifyOnNewMatch,
          notifyOnNewMessage: formState.notifyOnNewMessage,
          notifyOnAnnouncements: formState.notifyOnAnnouncements,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | { profile: Profile }
        | { error: string };

      if (!response.ok || !("profile" in data)) {
        throw new Error("error" in data ? data.error : "Failed to save profile");
      }

      toast.success("Profile saved!");

      const updated = data.profile;
      setFormState((prev) => ({
        ...prev,
        name: updated.name ?? "",
        bio: updated.bio ?? "",
        gamePref: updated.gamePref ?? "",
        timeSlot: updated.timeSlot ?? "",
        timeSlots: updated.timeSlots ?? [],
        language: updated.language ?? "",
        playstyle: updated.playstyle ?? "",
      }));
      if (onUpdated) {
        onUpdated(updated);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not save profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: STEP_COUNT }).map((_, index) => {
          const isCurrent = index === step;
          const isComplete = index < step;
          return (
            <span
              key={index}
              className={cn(
                "h-2 w-2 rounded-full border border-accent-cyan/40 transition-all",
                isCurrent && "bg-accent-cyan scale-110",
                !isCurrent && isComplete && "bg-accent-purple",
                !isCurrent && !isComplete && "bg-transparent"
              )}
            />
          );
        })}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred MMO</Label>
            <Select
              value={formState.gamePref || undefined}
              onOpenChange={(open) => {
                if (!open) {
                  setGameSearch("");
                }
              }}
              onValueChange={(value) => {
                handleChange("gamePref", value);
                setGameSearch("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    value={gameSearch}
                    onChange={(event) => setGameSearch(event.target.value)}
                    placeholder="Search games..."
                    className="h-9"
                    onKeyDown={(event) => event.stopPropagation()}
                    autoComplete="off"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredGames.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  {filteredGames.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400">No games found.</div>
                  )}
                </div>
              </SelectContent>
            </Select>
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
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Time Slots</Label>
              {timeZoneLabel && (
                <span className="text-xs text-gray-500">Your timezone: {timeZoneLabel}</span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIME_SLOTS.map((option) => {
                const isSelected = formState.timeSlots.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleTimeSlot(option.value)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-xs font-medium transition",
                      isSelected
                        ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan shadow-glow"
                        : "border-accent-purple/20 bg-background/60 text-gray-200 hover:border-accent-cyan/40 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Pick every window that usually works for you. We’ll use your first selection as the primary match slot.
            </p>
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
                    <span className="flex items-center gap-2">
                      {option.icon && (
                        <span className="text-lg" aria-hidden="true">
                          {option.icon}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <AvatarUploader profile={profile} onUpload={handleAvatarUpload} />
            <p className="text-xs text-gray-400">
              Upload a square image up to 2MB. We host avatars locally and serve them fast.
            </p>
          </div>
          <div className="space-y-4">
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
                placeholder="Example: Support main healer ready for Mythic Raids. Loves theorycrafting and chill dungeon runs."
              />
              <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Share your role, goals, and play vibe to attract the right squad.</span>
                <span>{formState.bio.length}/200</span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-accent-cyan/20 bg-background/50 p-4">
              <p className="text-sm font-semibold text-gray-200">Notifications</p>
              <label className="flex items-start gap-3 text-xs text-gray-400 lg:text-sm">
                <input
                  type="checkbox"
                  checked={formState.notifyOnNewMatch}
                  onChange={(event) => handleChange("notifyOnNewMatch", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border border-accent-cyan/40 bg-transparent accent-accent-cyan"
                />
                <span>Send me an email when I get a new match.</span>
              </label>
              <label className="flex items-start gap-3 text-xs text-gray-400 lg:text-sm">
                <input
                  type="checkbox"
                  checked={formState.notifyOnNewMessage}
                  onChange={(event) => handleChange("notifyOnNewMessage", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border border-accent-cyan/40 bg-transparent accent-accent-cyan"
                />
                <span>Send me an email when a match sends a new message.</span>
              </label>
              <label className="flex items-start gap-3 text-xs text-gray-400 lg:text-sm">
                <input
                  type="checkbox"
                  checked={formState.notifyOnAnnouncements}
                  onChange={(event) => handleChange("notifyOnAnnouncements", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border border-accent-cyan/40 bg-transparent accent-accent-cyan"
                />
                <span>Send me occasional product updates and announcements.</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto"
            onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
            disabled={isSaving}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" className="sm:w-auto" disabled={isSaving}>
          {isFinalStep ? (isSaving ? "Saving..." : "Save profile") : "Next"}
        </Button>
      </div>
    </form>
  );
}
