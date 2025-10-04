import { useMutation, useQueryClient } from "@tanstack/react-query";

async function markMatchViewed(matchId: string): Promise<void> {
  const response = await fetch(`/api/matches/${matchId}/view`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to mark match as viewed");
  }
}

export function useMarkMatchViewed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markMatchViewed,
    mutationKey: ["markMatchViewed"],
    onSuccess: () => {
      // Invalidate the unread count cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    },
    // Prevent retries to avoid infinite loops
    retry: false,
  });
}
