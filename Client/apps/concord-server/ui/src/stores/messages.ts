/**
 * Messages store for the server UI.
 * Same interface as the client's messages.ts.
 */

import { create } from "zustand";
import type { ChatMessage, MessageProfile } from "@concord/protocol";

export interface DisplayMessage extends ChatMessage {
  profile: MessageProfile;
}

interface MessagesState {
  channels: Record<string, DisplayMessage[]>;
  hasMore: Record<string, boolean>;
  loading: Record<string, boolean>;
  getMessages: (channelId: string) => DisplayMessage[];
  addMessage: (channelId: string, message: DisplayMessage) => void;
  setHistory: (channelId: string, messages: DisplayMessage[]) => void;
  prependHistory: (channelId: string, messages: DisplayMessage[]) => void;
  setHasMore: (channelId: string, hasMore: boolean) => void;
  setLoading: (channelId: string, loading: boolean) => void;
  clearChannel: (channelId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  channels: {},
  hasMore: {},
  loading: {},

  getMessages: (channelId) => get().channels[channelId] ?? [],

  addMessage: (channelId, message) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: [...(state.channels[channelId] ?? []), message],
      },
    })),

  setHistory: (channelId, messages) =>
    set((state) => ({
      channels: { ...state.channels, [channelId]: messages },
    })),

  prependHistory: (channelId, messages) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: [...messages, ...(state.channels[channelId] ?? [])],
      },
    })),

  setHasMore: (channelId, hasMore) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [channelId]: hasMore },
    })),

  setLoading: (channelId, loading) =>
    set((state) => ({
      loading: { ...state.loading, [channelId]: loading },
    })),

  clearChannel: (channelId) =>
    set((state) => {
      const { [channelId]: _, ...rest } = state.channels;
      return { channels: rest };
    }),
}));
