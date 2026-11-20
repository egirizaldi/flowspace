import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.isRead !== undefined) queryParams.set('isRead', params.isRead);

  const queryStr = queryParams.toString();
  const endpoint = `/notifications${queryStr ? `?${queryStr}` : ''}`;

  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const res = await apiClient.get<NotificationItem[]>(endpoint);
      return {
        notifications: res.data || [],
        meta: (res as any).meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
    },
    staleTime: 15 * 1000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ unreadCount: number }>(
        '/notifications/unread-count',
      );
      return res.data?.unreadCount ?? 0;
    },
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiClient.patch<NotificationItem>(
        `/notifications/${notificationId}/read`,
        {},
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch<{ success: boolean; count: number }>(
        '/notifications/read-all',
        {},
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
