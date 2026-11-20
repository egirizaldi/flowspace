import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CommentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface TaskCommentItem {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  user: CommentUser;
}

export function useTaskComments(taskId?: string | null) {
  return useQuery({
    queryKey: ['comments', 'task', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await apiClient.get<TaskCommentItem[]>(
        `/tasks/${taskId}/comments?sort=asc`,
      );
      return res.data;
    },
    enabled: Boolean(taskId),
    staleTime: 10 * 1000,
  });
}

export function useCreateComment(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { content: string }) => {
      const res = await apiClient.post<TaskCommentItem>(
        `/tasks/${taskId}/comments`,
        payload,
      );
      return res.data;
    },
    onMutate: async (newComment) => {
      await queryClient.cancelQueries({
        queryKey: ['comments', 'task', taskId],
      });

      const previousComments =
        queryClient.getQueryData<TaskCommentItem[]>([
          'comments',
          'task',
          taskId,
        ]) || [];

      const optimisticComment: TaskCommentItem = {
        id: `temp-${Date.now()}`,
        taskId,
        userId: 'current-user',
        content: newComment.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: 'current-user',
          name: 'You',
          email: '',
        },
      };

      queryClient.setQueryData<TaskCommentItem[]>(
        ['comments', 'task', taskId],
        [...previousComments, optimisticComment],
      );

      return { previousComments };
    },
    onError: (_err, _newComment, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ['comments', 'task', taskId],
          context.previousComments,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments', 'task', taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['task', taskId],
      });
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

export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const res = await apiClient.patch<TaskCommentItem>(
        `/tasks/${taskId}/comments/${commentId}`,
        { content },
      );
      return res.data;
    },
    onSuccess: (updatedComment) => {
      queryClient.setQueryData<TaskCommentItem[]>(
        ['comments', 'task', taskId],
        (old = []) =>
          old.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments', 'task', taskId],
      });
    },
  });
}

export function useDeleteComment(taskId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
      return commentId;
    },
    onMutate: async (deletedCommentId) => {
      await queryClient.cancelQueries({
        queryKey: ['comments', 'task', taskId],
      });

      const previousComments =
        queryClient.getQueryData<TaskCommentItem[]>([
          'comments',
          'task',
          taskId,
        ]) || [];

      queryClient.setQueryData<TaskCommentItem[]>(
        ['comments', 'task', taskId],
        previousComments.filter((c) => c.id !== deletedCommentId),
      );

      return { previousComments };
    },
    onError: (_err, _id, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ['comments', 'task', taskId],
          context.previousComments,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments', 'task', taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['task', taskId],
      });
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
