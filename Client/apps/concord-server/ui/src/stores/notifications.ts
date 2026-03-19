import { create } from "zustand";
import { reportUnread } from "../features/bridge/iframe-bridge";

interface NotificationsState {
  unreadCounts: Record<string, number>;
  incrementUnread: (channelId: string) => void;
  markRead: (channelId: string) => void;
  clearAll: () => void;
  getTotalUnread: () => number;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  unreadCounts: {},

  incrementUnread: (channelId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: (state.unreadCounts[channelId] ?? 0) + 1,
      },
    }));
    // Report total to parent for sidebar badge
    const total = get().getTotalUnread();
    reportUnread(total);
  },

  markRead: (channelId) =>
    set((state) => {
      if (!(channelId in state.unreadCounts)) return state;
      const { [channelId]: _, ...rest } = state.unreadCounts;
      reportUnread(Object.values(rest).reduce((a, b) => a + b, 0));
      return { unreadCounts: rest };
    }),

  clearAll: () => {
    set({ unreadCounts: {} });
    reportUnread(0);
  },

  getTotalUnread: () => {
    const counts = get().unreadCounts;
    return Object.values(counts).reduce((a, b) => a + b, 0);
  },
}));
