import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeSlotCode =
  | "weekdays_mornings"
  | "weekdays_evenings"
  | "weekdays_nights"
  | "weekends_mornings"
  | "weekends_afternoons"
  | "weekends_evenings"
  | "weekends_all_day";

export const timeSlotsOverlap = (a?: TimeSlotCode | null, b?: TimeSlotCode | null) => {
  if (!a || !b) return false;
  if (a === b) return true;

  const [aDay, ...aRest] = a.split("_");
  const [bDay, ...bRest] = b.split("_");

  if (aDay !== bDay) return false;

  const aSlot = aRest.join("_");
  const bSlot = bRest.join("_");

  if (aSlot === "all_day" || bSlot === "all_day") return true;

  const paired = `${aSlot}-${bSlot}`;
  const inverse = `${bSlot}-${aSlot}`;

  const looseMatches = new Set([
    "evenings-nights",
    "nights-evenings",
    "afternoons-evenings",
    "evenings-afternoons",
  ]);

  if (looseMatches.has(paired) || looseMatches.has(inverse)) {
    return true;
  }

  return false;
};
