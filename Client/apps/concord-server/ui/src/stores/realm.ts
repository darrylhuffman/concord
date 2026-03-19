/**
 * Single-realm store for the server UI.
 * Unlike the client's realms.ts which tracks multiple realms,
 * this tracks exactly one realm (the one hosting this UI).
 */

import { create } from "zustand";
import type { RealmInfo, Channel, InviteLinkInfo } from "@concord/protocol";

type RealmStatus = "connecting" | "connected" | "disconnected" | "error";

interface RealmData {
  info: RealmInfo;
  channels: Channel[];
  activeChannelId: string | null;
  isAdmin: boolean;
  status: RealmStatus;
  error?: string;
  inviteLinks?: InviteLinkInfo[];
}

interface RealmState extends RealmData {
  setRealm: (data: Omit<RealmData, "error">) => void;
  setStatus: (status: RealmStatus, error?: string) => void;
  setActiveChannel: (channelId: string | null) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  updateChannels: (channels: Channel[]) => void;
  updateInfo: (partial: Partial<RealmInfo>) => void;
  setInviteLinks: (links: InviteLinkInfo[]) => void;
}

export const useRealmStore = create<RealmState>((set, get) => ({
  info: { id: "", name: "", encrypted: false, createdAt: 0 },
  channels: [],
  activeChannelId: null,
  isAdmin: false,
  status: "connecting",
  inviteLinks: undefined,

  setRealm: (data) => set({ ...data }),

  setStatus: (status, error) => set({ status, error }),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  addChannel: (channel) =>
    set((state) => ({ channels: [...state.channels, channel] })),

  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      activeChannelId:
        state.activeChannelId === channelId ? null : state.activeChannelId,
    })),

  updateChannels: (channels) => set({ channels }),

  updateInfo: (partial) =>
    set((state) => ({ info: { ...state.info, ...partial } })),

  setInviteLinks: (links) => set({ inviteLinks: links }),
}));
