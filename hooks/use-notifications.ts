"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { POLL_30S } from "@/lib/query-options";

export interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

const EMPTY_NOTIFICATIONS: NotificationsResponse = {
  notifications: [],
  unreadCount: 0,
};

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch("/api/notifications");
  if (!response.ok) {
    throw new Error("Failed to load notifications");
  }
  return response.json() as Promise<NotificationsResponse>;
}

async function markNotificationAsRead(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }
}

async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch("/api/notifications/mark-all-read", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to mark notifications as read");
  }
}

function readNotification(
  data: NotificationsResponse | undefined,
  id: string,
): NotificationsResponse {
  const current = data ?? EMPTY_NOTIFICATIONS;
  const wasUnread = current.notifications.some((notification) => {
    return notification.id === id && !notification.isRead;
  });
  const readAt = new Date().toISOString();

  return {
    notifications: current.notifications.map((notification) =>
      notification.id === id ? { ...notification, isRead: true, readAt } : notification,
    ),
    unreadCount: wasUnread ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
  };
}

function readAllNotifications(data: NotificationsResponse | undefined): NotificationsResponse {
  const current = data ?? EMPTY_NOTIFICATIONS;
  const readAt = new Date().toISOString();

  return {
    notifications: current.notifications.map((notification) => ({
      ...notification,
      isRead: true,
      readAt: notification.readAt ?? readAt,
    })),
    unreadCount: 0,
  };
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.notifications.list();
  const notificationsQuery = useQuery({
    queryKey,
    queryFn: fetchNotifications,
    ...POLL_30S,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationsResponse>(queryKey);
      queryClient.setQueryData<NotificationsResponse>(queryKey, (current) =>
        readNotification(current, id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationsResponse>(queryKey);
      queryClient.setQueryData<NotificationsResponse>(queryKey, readAllNotifications);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const data = notificationsQuery.data ?? EMPTY_NOTIFICATIONS;

  return {
    notifications: data.notifications,
    unreadCount: data.unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    refetch: async () => {
      await notificationsQuery.refetch();
    },
  };
}
