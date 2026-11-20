'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  MessageSquare,
  UserCheck,
  Inbox,
  Loader2,
} from 'lucide-react';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NotificationItem,
} from '@/hooks/use-notifications';
import { formatRelativeTime } from '@/lib/format-comment';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data, isLoading } = useNotifications({
    limit: 20,
    isRead: filterUnread ? 'false' : undefined,
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications || [];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <UserCheck className="w-4 h-4 text-primary" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open notifications"
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface-elevated/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-surface/80 text-xs">
            <button
              type="button"
              onClick={() => setFilterUnread(false)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                !filterUnread
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterUnread(true)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterUnread
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread only
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2 px-4 text-center">
                <div className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center text-muted-foreground">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  {filterUnread ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {filterUnread
                    ? "You've caught up with everything!"
                    : "When tasks are assigned or comments are added, they'll appear here."}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-surface-elevated/60 ${
                    !item.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !item.isRead
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/80'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {item.message}
                    </p>
                  </div>

                  {!item.isRead && (
                    <button
                      type="button"
                      title="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(item.id);
                      }}
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 mt-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
