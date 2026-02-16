import { useQuery } from "@tanstack/react-query";

interface TeamLocationsResponse {
  team_locations: string[];
}

export function useTeamLocations(productId: string | null) {
  return useQuery({
    queryKey: ["team-locations", productId],
    queryFn: async () => {
      if (!productId) throw new Error("Product ID is required");

      const params = new URLSearchParams({ productId });
      const response = await fetch(`/api/aha/team-locations?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch team locations: ${response.statusText}`
        );
      }

      return response.json() as Promise<TeamLocationsResponse>;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
