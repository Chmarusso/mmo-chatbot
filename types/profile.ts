export type GamePref =
  | "world_of_warcraft"
  | "final_fantasy_xiv"
  | "lost_ark"
  | "elder_scrolls_online"
  | "new_world"
  | "guild_wars_2"
  | "black_desert_online";

export type TimeSlot =
  | "weekdays_mornings"
  | "weekdays_afternoons"
  | "weekdays_evenings"
  | "weekends_mornings"
  | "weekends_afternoons"
  | "weekends_evenings"
  | "weekends_late";

export type Language =
  | "english"
  | "spanish"
  | "french"
  | "german"
  | "portuguese"
  | "russian"
  | "chinese"
  | "polish";

export type Playstyle =
  | "casual"
  | "competitive"
  | "role_playing"
  | "pve_focused"
  | "pvp_focused"
  | "explorer";

export interface Profile {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  twitterLink: string | null;
  redditLink: string | null;
  gamePref: GamePref | null;
  gamePreferences: GamePref[];
  timeSlot: TimeSlot | null;
  timeSlots: TimeSlot[];
  language: Language | null;
  playstyle: Playstyle | null;
  theme: string | null;
  inviteCode: string | null;
  isVerified: boolean;
  isShadowbanned: boolean;
  isChild: boolean;
  notifyOnNewMatch: boolean;
  notifyOnNewMessage: boolean;
  notifyOnAnnouncements: boolean;
  guardianProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PreferenceOption<TValue extends string> = {
  label: string;
  value: TValue;
  icon?: string;
};

export const GAME_OPTIONS: PreferenceOption<GamePref>[] = [
  { label: "World of Warcraft", value: "world_of_warcraft" },
  { label: "Final Fantasy XIV", value: "final_fantasy_xiv" },
  { label: "Lost Ark", value: "lost_ark" },
  { label: "Elder Scrolls Online", value: "elder_scrolls_online" },
  { label: "New World", value: "new_world" },
  { label: "Guild Wars 2", value: "guild_wars_2" },
  { label: "Black Desert Online", value: "black_desert_online" },
];

export const TIME_SLOTS: PreferenceOption<TimeSlot>[] = [
  { label: "Weekday mornings (06:00-10:00)", value: "weekdays_mornings" },
  { label: "Weekday afternoons (12:00-16:00)", value: "weekdays_afternoons" },
  { label: "Weekday evenings (17:00-21:00)", value: "weekdays_evenings" },
  { label: "Weekend mornings (08:00-12:00)", value: "weekends_mornings" },
  { label: "Weekend afternoons (12:00-16:00)", value: "weekends_afternoons" },
  { label: "Weekend evenings (16:00-20:00)", value: "weekends_evenings" },
  { label: "Weekend late nights (20:00-24:00)", value: "weekends_late" },
];

export const LANGUAGES: PreferenceOption<Language>[] = [
  { label: "English", value: "english", icon: "🇬🇧" },
  { label: "Spanish", value: "spanish", icon: "🇪🇸" },
  { label: "French", value: "french", icon: "🇫🇷" },
  { label: "German", value: "german", icon: "🇩🇪" },
  { label: "Portuguese", value: "portuguese", icon: "🇵🇹" },
  { label: "Russian", value: "russian", icon: "🇷🇺" },
  { label: "Chinese", value: "chinese", icon: "🇨🇳" },
  { label: "Polish", value: "polish", icon: "🇵🇱" },
];

export const PLAYSTYLES: PreferenceOption<Playstyle>[] = [
  { label: "Casual", value: "casual" },
  { label: "Competitive", value: "competitive" },
  { label: "Role-Playing", value: "role_playing" },
  { label: "PvE-Focused", value: "pve_focused" },
  { label: "PvP-Focused", value: "pvp_focused" },
  { label: "Explorer", value: "explorer" },
];

export const preferenceLabel = (
  value: string,
  options: PreferenceOption<string>[]
): string => {
  const option = options.find((current) => current.value === value);
  if (!option) {
    return value;
  }

  return option.icon ? `${option.icon} ${option.label}` : option.label;
};
