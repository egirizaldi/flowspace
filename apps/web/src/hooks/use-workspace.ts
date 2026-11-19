import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '@flowspace/shared';

export interface OrganizationWorkspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  _count: {
    members: number;
    projects: number;
  };
}

export interface WorkspaceDetail extends OrganizationWorkspace {
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  members: Array<{
    id: string;
    workspaceId: string;
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

export function useOrganizationWorkspaces(organizationId?: string | null) {
  return useQuery({
    queryKey: ['workspaces', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const res = await apiClient.get<OrganizationWorkspace[]>(
        `/organizations/${organizationId}/workspaces`,
      );
      return res.data;
    },
    enabled: Boolean(organizationId),
    staleTime: 30 * 1000,
  });
}

export function useWorkspace(workspaceId?: string | null) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is required');
      const res = await apiClient.get<WorkspaceDetail>(
        `/workspaces/${workspaceId}`,
      );
      return res.data;
    },
    enabled: Boolean(workspaceId),
  });
}

export function useCreateWorkspace(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const res = await apiClient.post<OrganizationWorkspace>(
        `/organizations/${organizationId}/workspaces`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId],
      });
    },
  });
}

export function useUpdateWorkspace(
  workspaceId: string,
  organizationId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceInput) => {
      const res = await apiClient.patch<OrganizationWorkspace>(
        `/workspaces/${workspaceId}`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: ['workspaces', organizationId],
        });
      }
    },
  });
}

export function useDeleteWorkspace(
  workspaceId: string,
  organizationId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/workspaces/${workspaceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: ['workspaces', organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['organizations', organizationId],
        });
      }
    },
  });
}
