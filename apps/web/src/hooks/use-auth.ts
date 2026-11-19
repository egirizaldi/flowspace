import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { SafeUser } from '@flowspace/shared';
import { useRouter } from 'next/navigation';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await apiClient.get<SafeUser>('/auth/me');
      return res.data;
    },
    retry: 0,
    staleTime: 60 * 1000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });
}
