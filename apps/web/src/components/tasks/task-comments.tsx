'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  AtSign,
} from 'lucide-react';
import {
  useTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  TaskCommentItem,
} from '@/hooks/use-comments';
import { useCurrentUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, tokenizeComment } from '@/lib/format-comment';

interface TaskCommentsProps {
  taskId: string;
  projectId: string;
  members?: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  }>;
}

export function TaskComments({
  taskId,
  projectId,
  members = [],
}: TaskCommentsProps) {
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const { data: currentUser } = useCurrentUser();

  const createComment = useCreateComment(taskId, projectId);
  const updateComment = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId, projectId);

  const [newContent, setNewContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || createComment.isPending) return;

    const contentToSubmit = newContent;
    setNewContent('');
    try {
      await createComment.mutateAsync({ content: contentToSubmit });
    } catch {
      setNewContent(contentToSubmit);
    }
  };

  const handleStartEdit = (comment: TaskCommentItem) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim() || updateComment.isPending) return;

    try {
      await updateComment.mutateAsync({
        commentId,
        content: editContent,
      });
      setEditingCommentId(null);
    } catch {
      // Keep edit state on failure
    }
  };

  const handleDelete = async (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      await deleteComment.mutateAsync(commentId);
    }
  };

  const insertMention = (name: string) => {
    const handle = name.replace(/\s+/g, '');
    setNewContent((prev) => `${prev ? prev + ' ' : ''}@${handle} `);
  };

  const renderFormattedContent = (content: string) => {
    const tokens = tokenizeComment(content);
    return tokens.map((token, index) => {
      switch (token.type) {
        case 'bold':
          return <strong key={index} className="font-semibold text-foreground">{token.value}</strong>;
        case 'italic':
          return <em key={index} className="italic text-foreground">{token.value}</em>;
        case 'code':
          return (
            <code
              key={index}
              className="bg-surface-elevated border border-border px-1 py-0.5 rounded text-[11px] font-mono text-primary font-medium"
            >
              {token.value}
            </code>
          );
        case 'mention':
          return (
            <span
              key={index}
              className="inline-flex items-center text-primary font-medium bg-primary/10 px-1 py-0.5 rounded text-[11px]"
            >
              {token.value}
            </span>
          );
        case 'newline':
          return <br key={index} />;
        case 'text':
        default:
          return <span key={index}>{token.value}</span>;
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> Discussion & Comments
          <span className="text-xs font-normal font-mono text-muted-foreground">
            ({comments.length})
          </span>
        </span>
      </div>

      {/* Comment List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border bg-surface text-center">
            <p className="text-xs text-muted-foreground italic">
              No comments yet. Start the conversation!
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor =
              currentUser?.id && comment.userId === currentUser.id;
            const isEditing = editingCommentId === comment.id;
            const isEdited =
              new Date(comment.updatedAt).getTime() >
              new Date(comment.createdAt).getTime() + 1000;

            return (
              <div
                key={comment.id}
                className="p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated transition-colors"
              >
                {/* Comment Header: Author & Date */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                      {comment.user?.name ? comment.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {comment.user?.name || 'User'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {isEdited && (
                      <span className="text-[10px] text-muted-foreground/70 italic">
                        (edited)
                      </span>
                    )}
                  </div>

                  {/* Actions for author */}
                  {isAuthor && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                        title="Edit comment"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Comment Body / Inline Edit */}
                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCommentId(null)}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={updateComment.isPending || !editContent.trim()}
                        className="h-7 px-2 text-xs"
                      >
                        {updateComment.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-foreground leading-relaxed pl-8">
                    {renderFormattedContent(comment.content)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Mention Suggestions */}
      {members.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs text-muted-foreground">
          <AtSign className="w-3 h-3 shrink-0" />
          <span className="text-[10px] shrink-0 font-medium">Mention:</span>
          {members.slice(0, 5).map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => insertMention(m.user.name)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface hover:bg-surface-elevated text-foreground border border-border shrink-0 transition-colors"
            >
              @{m.user.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          placeholder="Write a comment... (Supports **bold**, *italic*, `code`, @mention)"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          disabled={createComment.isPending}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Press Comment to post feedback.
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={createComment.isPending || !newContent.trim()}
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            {createComment.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Comment</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
