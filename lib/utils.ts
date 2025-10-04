import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeSlotCode =
  | "weekdays_mornings"
  | "weekdays_afternoons"
  | "weekdays_evenings"
  | "weekends_mornings"
  | "weekends_afternoons"
  | "weekends_evenings"
  | "weekends_late";

export const timeSlotsOverlap = (a?: TimeSlotCode | null, b?: TimeSlotCode | null) => {
  if (!a || !b) return false;
  if (a === b) return true;

  const [aDay, ...aRest] = a.split("_");
  const [bDay, ...bRest] = b.split("_");

  if (aDay !== bDay) return false;

  const aSlot = aRest.join("_");
  const bSlot = bRest.join("_");

  const paired = `${aSlot}-${bSlot}`;
  const inverse = `${bSlot}-${aSlot}`;

  const looseMatches = new Set([
    "afternoons-evenings",
    "evenings-afternoons",
    "evenings-late",
    "late-evenings",
  ]);

  if (looseMatches.has(paired) || looseMatches.has(inverse)) {
    return true;
  }

  return false;
};
