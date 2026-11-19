import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@flowspace/shared';

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  _count: {
    members: number;
    workspaces: number;
  };
}

export interface OrganizationDetail extends UserOrganization {
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  members: Array<{
    id: string;
    organizationId: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  }>;
}

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await apiClient.get<UserOrganization[]>('/organizations');
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useOrganization(organizationId?: string | null) {
  return useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      const res = await apiClient.get<OrganizationDetail>(
        `/organizations/${organizationId}`,
      );
      return res.data;
    },
    enabled: Boolean(organizationId),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const res = await apiClient.post<UserOrganization>(
        '/organizations',
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateOrganizationInput) => {
      const res = await apiClient.patch<UserOrganization>(
        `/organizations/${organizationId}`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId],
      });
    },
  });
}

export function useDeleteOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/organizations/${organizationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
