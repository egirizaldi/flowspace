import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
  AssignTaskInput,
  MoveTaskInput,
  CreateLabelInput,
  TaskPriority,
} from '@flowspace/shared';

export interface TaskLabelItem {
  taskId: string;
  labelId: string;
  createdAt?: string;
  label: {
    id: string;
    name: string;
    color: string;
  };
}

export interface SubtaskItem {
  id: string;
  taskNumber: number;
  title: string;
  priority: TaskPriority;
  position: string | number;
  status: {
    id: string;
    name: string;
    category: string;
    color: string;
  };
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
}

export interface TaskItem {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  taskNumber: number;
  taskKey: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  statusId: string;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  position: string | number;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  status: {
    id: string;
    name: string;
    category: string;
    color: string;
    position: number;
    isDefault: boolean;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  labels?: TaskLabelItem[];
  parentTask?: {
    id: string;
    taskNumber: number;
    title: string;
  } | null;
  subtasks?: SubtaskItem[];
  _count?: {
    comments: number;
    attachments: number;
    subtasks: number;
  };
}

export interface ProjectLabelItem {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface KanbanBoardTaskItem {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  taskNumber: number;
  taskKey: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  statusId: string;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  position: string | number;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  _count?: {
    comments: number;
    attachments: number;
    subtasks: number;
  };
}

export interface KanbanColumnItem {
  id: string;
  name: string;
  category: string;
  color: string;
  position: number;
  isDefault: boolean;
  tasks: KanbanBoardTaskItem[];
}

export interface KanbanBoardData {
  projectId: string;
  projectKey: string;
  projectName: string;
  columns: KanbanColumnItem[];
}

export interface QueryBoardOptions {
  assigneeId?: string;
  priority?: string;
  search?: string;
  includeSubtasks?: boolean;
}

export interface TaskActivityItem {
  id: string;
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface QueryTasksOptions {
  statusId?: string;
  priority?: string;
  assigneeId?: string;
  parentTaskId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useProjectTasks(
  projectId?: string | null,
  options?: QueryTasksOptions,
) {
  const queryParams = new URLSearchParams();
  if (options?.statusId) queryParams.set('statusId', options.statusId);
  if (options?.priority) queryParams.set('priority', options.priority);
  if (options?.assigneeId) queryParams.set('assigneeId', options.assigneeId);
  if (options?.parentTaskId) queryParams.set('parentTaskId', options.parentTaskId);
  if (options?.search) queryParams.set('search', options.search);
  if (options?.page) queryParams.set('page', String(options.page));
  if (options?.limit) queryParams.set('limit', String(options.limit));
  const queryStr = queryParams.toString();

  return useQuery({
    queryKey: ['tasks', 'project', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];
      const url = `/projects/${projectId}/tasks${queryStr ? `?${queryStr}` : ''}`;
      const res = await apiClient.get<TaskItem[]>(url);
      return res.data;
    },
    enabled: Boolean(projectId),
    staleTime: 15 * 1000,
  });
}

export function useTask(taskId?: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is required');
      const res = await apiClient.get<TaskItem>(`/tasks/${taskId}`);
      return res.data;
    },
    enabled: Boolean(taskId),
    staleTime: 15 * 1000,
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaskInput) => {
      const res = await apiClient.post<TaskItem>(
        `/projects/${projectId}/tasks`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['board', 'project', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}

export function useUpdateTask(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTaskInput) => {
      const res = await apiClient.patch<TaskItem>(`/tasks/${taskId}`, payload);
      return res.data;
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['task', taskId], updatedTask);
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['task-activities', taskId],
      });
    },
  });
}

export function useUpdateTaskStatus(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTaskStatusInput) => {
      const res = await apiClient.patch<TaskItem>(
        `/tasks/${taskId}/status`,
        payload,
      );
      return res.data;
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['task', taskId], updatedTask);
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['task-activities', taskId],
      });
    },
  });
}

export function useAssignTask(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AssignTaskInput) => {
      let res;
      if (payload.assigneeId === null) {
        res = await apiClient.delete<TaskItem>(`/tasks/${taskId}/assignee`);
      } else {
        res = await apiClient.patch<TaskItem>(`/tasks/${taskId}/assignee`, payload);
      }
      return res.data;
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['task', taskId], updatedTask);
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['task-activities', taskId],
      });
    },
  });
}

export function useDeleteTask(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete<{ success: boolean; deletedId: string }>(
        `/tasks/${taskId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['task', taskId] });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
    },
  });
}

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: MoveTaskInput;
    }) => {
      const res = await apiClient.patch<TaskItem>(`/tasks/${taskId}/move`, payload);
      return res.data;
    },
    onMutate: async ({ taskId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['board', 'project', projectId] });

      const previousBoard = queryClient.getQueryData<KanbanBoardData>([
        'board',
        'project',
        projectId,
      ]);

      if (previousBoard) {
        let movedTask: KanbanBoardTaskItem | null = null;

        const updatedColumns = previousBoard.columns.map((column) => {
          const found = column.tasks.find((t) => t.id === taskId);
          if (found) {
            movedTask = {
              ...found,
              statusId: payload.statusId,
              position: payload.position,
              version: found.version + 1,
            };
            return {
              ...column,
              tasks: column.tasks.filter((t) => t.id !== taskId),
            };
          }
          return column;
        });

        if (movedTask) {
          const targetColIndex = updatedColumns.findIndex(
            (c) => c.id === payload.statusId,
          );
          if (targetColIndex !== -1) {
            const targetCol = updatedColumns[targetColIndex];
            const newTasks = [...targetCol.tasks, movedTask].sort(
              (a, b) => Number(a.position) - Number(b.position),
            );
            updatedColumns[targetColIndex] = {
              ...targetCol,
              tasks: newTasks,
            };
          }
        }

        queryClient.setQueryData<KanbanBoardData>(
          ['board', 'project', projectId],
          {
            ...previousBoard,
            columns: updatedColumns,
          },
        );
      }

      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(
          ['board', 'project', projectId],
          context.previousBoard,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['board', 'project', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', projectId],
      });
    },
  });
}

export function useProjectLabels(projectId?: string | null) {
  return useQuery({
    queryKey: ['labels', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await apiClient.get<ProjectLabelItem[]>(
        `/projects/${projectId}/labels`,
      );
      return res.data;
    },
    enabled: Boolean(projectId),
    staleTime: 30 * 1000,
  });
}

export function useCreateProjectLabel(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLabelInput) => {
      const res = await apiClient.post<ProjectLabelItem>(
        `/projects/${projectId}/labels`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['labels', 'project', projectId],
      });
    },
  });
}

export function useAttachTaskLabel(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      const res = await apiClient.post<TaskItem>(`/tasks/${taskId}/labels`, {
        labelId,
      });
      return res.data;
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['task', taskId], updatedTask);
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
    },
  });
}

export function useDetachTaskLabel(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      const res = await apiClient.delete(`/tasks/${taskId}/labels/${labelId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
    },
  });
}

export function useCreateSubtask(parentTaskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaskInput) => {
      const res = await apiClient.post<TaskItem>(
        `/tasks/${parentTaskId}/subtasks`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', parentTaskId] });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', 'project', projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ['board', 'project', projectId],
        });
      }
    },
  });
}

export function useKanbanBoard(
  projectId?: string | null,
  options?: QueryBoardOptions,
) {
  const queryParams = new URLSearchParams();
  if (options?.assigneeId) queryParams.set('assigneeId', options.assigneeId);
  if (options?.priority) queryParams.set('priority', options.priority);
  if (options?.search) queryParams.set('search', options.search);
  if (options?.includeSubtasks) queryParams.set('includeSubtasks', 'true');
  const queryStr = queryParams.toString();

  return useQuery({
    queryKey: ['board', 'project', projectId, options],
    queryFn: async () => {
      if (!projectId) return null;
      const url = `/projects/${projectId}/board${queryStr ? `?${queryStr}` : ''}`;
      const res = await apiClient.get<KanbanBoardData>(url);
      return res.data;
    },
    enabled: Boolean(projectId),
    staleTime: 15 * 1000,
  });
}

export function useTaskActivities(taskId?: string | null) {
  return useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await apiClient.get<TaskActivityItem[]>(
        `/tasks/${taskId}/activities`,
      );
      return res.data;
    },
    enabled: Boolean(taskId),
    staleTime: 10 * 1000,
  });
}
