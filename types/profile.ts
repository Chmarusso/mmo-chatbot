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
  | "weekdays_evenings"
  | "weekdays_nights"
  | "weekends_mornings"
  | "weekends_afternoons"
  | "weekends_evenings"
  | "weekends_all_day";

export type Language =
  | "english"
  | "spanish"
  | "french"
  | "german"
  | "portuguese"
  | "russian"
  | "chinese";

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
  timeSlot: TimeSlot | null;
  language: Language | null;
  playstyle: Playstyle | null;
  isVerified: boolean;
  isShadowbanned: boolean;
  isChild: boolean;
  guardianProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PreferenceOption<TValue extends string> = {
  label: string;
  value: TValue;
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
  { label: "Weekdays Mornings (UTC)", value: "weekdays_mornings" },
  { label: "Weekdays Evenings (UTC)", value: "weekdays_evenings" },
  { label: "Weekdays Nights (UTC)", value: "weekdays_nights" },
  { label: "Weekends Mornings (UTC)", value: "weekends_mornings" },
  { label: "Weekends Afternoons (UTC)", value: "weekends_afternoons" },
  { label: "Weekends Evenings (UTC)", value: "weekends_evenings" },
  { label: "Weekends All Day (UTC)", value: "weekends_all_day" },
];

export const LANGUAGES: PreferenceOption<Language>[] = [
  { label: "English", value: "english" },
  { label: "Spanish", value: "spanish" },
  { label: "French", value: "french" },
  { label: "German", value: "german" },
  { label: "Portuguese", value: "portuguese" },
  { label: "Russian", value: "russian" },
  { label: "Chinese", value: "chinese" },
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
): string => options.find((option) => option.value === value)?.label ?? value;
