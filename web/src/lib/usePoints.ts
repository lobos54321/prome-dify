import useSWR, { KeyedMutator } from 'swr';

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// API base URL - in production this would come from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface PointsResponse {
  balance: number;
}

interface UsePointsReturn {
  balance: number | undefined;
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<PointsResponse>;
}

export function usePoints(): UsePointsReturn {
  const { data, error, isLoading, mutate } = useSWR<PointsResponse>(
    `${API_BASE_URL}/api/me/points`,
    fetcher,
    {
      // Poll every 30 seconds
      refreshInterval: 30000,
      // Revalidate when window gets focus
      revalidateOnFocus: true,
      // Keep previous data while loading new data
      keepPreviousData: true,
      // Retry on error
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    balance: data?.balance,
    isLoading,
    error,
    mutate,
  };
}

// Helper function to update points optimistically
export function updatePointsOptimistically(
  mutate: KeyedMutator<PointsResponse>,
  newBalance: number
) {
  mutate(
    { balance: newBalance },
    {
      // Optimistically update the cache without revalidation
      optimisticData: { balance: newBalance },
      // Don't revalidate immediately
      revalidate: false,
    }
  );
}