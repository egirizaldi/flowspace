import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectLifecycleStatus,
  ProjectRole,
} from '@flowspace/shared';

export interface ProjectListItem {
  id: string;
  workspaceId: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectLifecycleStatus;
  startDate?: string | null;
  dueDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  _count: {
    members: number;
    tasks: number;
  };
  statuses: Array<{
    id: string;
    name: string;
    category: string;
    color: string;
    position: number;
    isDefault: boolean;
  }>;
}

export interface ProjectMemberItem {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface ProjectDetail extends ProjectListItem {
  workspace: {
    id: string;
    name: string;
    slug: string;
    organizationId: string;
  };
  members: ProjectMemberItem[];
}

export function useWorkspaceProjects(
  workspaceId?: string | null,
  options?: {
    status?: string;
    search?: string;
    includeArchived?: boolean;
  },
) {
  const queryParams = new URLSearchParams();
  if (options?.status) queryParams.set('status', options.status);
  if (options?.search) queryParams.set('search', options.search);
  if (options?.includeArchived) queryParams.set('includeArchived', 'true');
  const queryStr = queryParams.toString();

  return useQuery({
    queryKey: ['projects', 'workspace', workspaceId, options],
    queryFn: async () => {
      if (!workspaceId) return [];
      const url = `/workspaces/${workspaceId}/projects${queryStr ? `?${queryStr}` : ''}`;
      const res = await apiClient.get<ProjectListItem[]>(url);
      return res.data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30 * 1000,
  });
}

export function useProject(projectId?: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const res = await apiClient.get<ProjectDetail>(`/projects/${projectId}`);
      return res.data;
    },
    enabled: Boolean(projectId),
    staleTime: 30 * 1000,
  });
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProjectInput) => {
      const res = await apiClient.post<ProjectDetail>(
        `/workspaces/${workspaceId}/projects`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', 'workspace', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace', workspaceId],
      });
    },
  });
}

export function useUpdateProject(projectId: string, workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProjectInput) => {
      const res = await apiClient.patch<ProjectDetail>(
        `/projects/${projectId}`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ['projects', 'workspace', workspaceId],
        });
      }
    },
  });
}

export function useArchiveProject(projectId: string, workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ProjectDetail>(
        `/projects/${projectId}/archive`,
        {},
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ['projects', 'workspace', workspaceId],
        });
      }
    },
  });
}

export function useRestoreProject(projectId: string, workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ProjectDetail>(
        `/projects/${projectId}/restore`,
        {},
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ['projects', 'workspace', workspaceId],
        });
      }
    },
  });
}

export function useDeleteProject(projectId: string, workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete(`/projects/${projectId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ['project', projectId],
      });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ['projects', 'workspace', workspaceId],
        });
      }
    },
  });
}

export function useProjectMembers(projectId?: string | null) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await apiClient.get<ProjectMemberItem[]>(
        `/projects/${projectId}/members`,
      );
      return res.data;
    },
    enabled: Boolean(projectId),
    staleTime: 30 * 1000,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string; role: ProjectRole }) => {
      const res = await apiClient.post<ProjectMemberItem>(
        `/projects/${projectId}/members`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-members', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}

export function useUpdateProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: ProjectRole;
    }) => {
      const res = await apiClient.patch<ProjectMemberItem>(
        `/projects/${projectId}/members/${memberId}`,
        { role },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-members', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiClient.delete(
        `/projects/${projectId}/members/${memberId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-members', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}
