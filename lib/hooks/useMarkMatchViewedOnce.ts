import { useEffect, useRef } from "react";
import { useMarkMatchViewed } from "./useMarkMatchViewed";

export function useMarkMatchViewedOnce(matchId: string) {
  const markMatchViewed = useMarkMatchViewed();
  const hasMarkedAsViewed = useRef(false);

  useEffect(() => {
    if (!hasMarkedAsViewed.current && !markMatchViewed.isPending && !markMatchViewed.isError) {
      hasMarkedAsViewed.current = true;
      markMatchViewed.mutate(matchId);
    }
  }, [matchId, markMatchViewed]);

  return markMatchViewed;
}
