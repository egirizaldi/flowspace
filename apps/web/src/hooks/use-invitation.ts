import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface InvitationInfo {
  id: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  isExpired: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  project?: {
    id: string;
    name: string;
    key: string;
  } | null;
  inviter: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface PendingInvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    name: string;
    email: string;
  };
}

export function useInvitationInfo(token?: string | null) {
  return useQuery({
    queryKey: ['invitation', 'info', token],
    queryFn: async () => {
      if (!token) throw new Error('Token is required');
      const res = await apiClient.get<InvitationInfo>(
        `/invitations/info?token=${encodeURIComponent(token)}`,
      );
      return res.data;
    },
    enabled: Boolean(token),
    retry: 0,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const res = await apiClient.post<any>('/invitations/accept', { token });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useOrganizationInvitations(organizationId?: string | null) {
  return useQuery({
    queryKey: ['invitations', 'organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const res = await apiClient.get<PendingInvitationItem[]>(
        `/organizations/${organizationId}/invitations`,
      );
      return res.data;
    },
    enabled: Boolean(organizationId),
  });
}

export function useWorkspaceInvitations(workspaceId?: string | null) {
  return useQuery({
    queryKey: ['invitations', 'workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await apiClient.get<PendingInvitationItem[]>(
        `/workspaces/${workspaceId}/invitations`,
      );
      return res.data;
    },
    enabled: Boolean(workspaceId),
  });
}

export function useInviteOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; role?: string }) => {
      const res = await apiClient.post<any>(
        `/organizations/${organizationId}/invitations`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invitations', 'organization', organizationId],
      });
    },
  });
}

export function useInviteWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; role?: string }) => {
      const res = await apiClient.post<any>(
        `/workspaces/${workspaceId}/invitations`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invitations', 'workspace', workspaceId],
      });
    },
  });
}

export function useRevokeInvitation(organizationId?: string, workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await apiClient.delete(`/invitations/${invitationId}`);
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: ['invitations', 'organization', organizationId],
        });
      }
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ['invitations', 'workspace', workspaceId],
        });
      }
    },
  });
}
