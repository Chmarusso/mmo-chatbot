import { useQuery } from "@tanstack/react-query";
import type { PreferenceOption } from "@/types/profile";
import { GAME_OPTIONS } from "@/types/profile";

type GameOption = PreferenceOption<string>;

async function fetchGameOptions(): Promise<GameOption[]> {
  const response = await fetch("/api/preferences/games", {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load game options");
  }

  const payload = (await response.json()) as { games?: GameOption[] };
  const options = (payload.games ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }));
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

const DEFAULT_GAME_OPTIONS = [...GAME_OPTIONS].sort((a, b) => a.label.localeCompare(b.label));

export function useGameOptions(initialOptions: GameOption[] = DEFAULT_GAME_OPTIONS) {
  const query = useQuery({
    queryKey: ["game-options"],
    queryFn: fetchGameOptions,
    placeholderData: () => initialOptions,
    staleTime: 0,
  });

  return {
    ...query,
    data: query.data ?? initialOptions,
  };
}
