/**
 * Voice store for the server UI.
 * Tracks voice channel participants (sidebar display).
 * Full voice/media functionality will be added in Phase 3.
 */

import { create } from "zustand";

interface ChannelParticipantInfo {
  publicKey: string;
  name: string;
}

interface VoiceState {
  activeChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  voiceChannelParticipants: Map<string, Map<string, ChannelParticipantInfo>>;
  screenShareChannels: Map<string, Set<string>>;

  setActiveChannel: (channelId: string | null) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setChannelParticipants: (channelId: string, participants: ChannelParticipantInfo[]) => void;
  addChannelParticipant: (channelId: string, participant: ChannelParticipantInfo) => void;
  removeChannelParticipant: (channelId: string, publicKey: string) => void;
  clearChannelParticipants: () => void;
  setScreenSharers: (data: Record<string, string[]>) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeChannelId: null,
  isMuted: false,
  isDeafened: false,
  voiceChannelParticipants: new Map(),
  screenShareChannels: new Map(),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  setMuted: (muted) => set({ isMuted: muted }),
  setDeafened: (deafened) => set({ isDeafened: deafened }),

  setChannelParticipants: (channelId, participants) =>
    set((state) => {
      const next = new Map(state.voiceChannelParticipants);
      const map = new Map<string, ChannelParticipantInfo>();
      for (const p of participants) map.set(p.publicKey, p);
      next.set(channelId, map);
      return { voiceChannelParticipants: next };
    }),

  addChannelParticipant: (channelId, participant) =>
    set((state) => {
      const next = new Map(state.voiceChannelParticipants);
      const existing = next.get(channelId) ?? new Map();
      const updated = new Map(existing);
      updated.set(participant.publicKey, participant);
      next.set(channelId, updated);
      return { voiceChannelParticipants: next };
    }),

  removeChannelParticipant: (channelId, publicKey) =>
    set((state) => {
      const next = new Map(state.voiceChannelParticipants);
      const existing = next.get(channelId);
      if (existing) {
        const updated = new Map(existing);
        updated.delete(publicKey);
        next.set(channelId, updated);
      }
      return { voiceChannelParticipants: next };
    }),

  clearChannelParticipants: () =>
    set({ voiceChannelParticipants: new Map() }),

  setScreenSharers: (data) =>
    set(() => {
      const next = new Map<string, Set<string>>();
      for (const [channelId, keys] of Object.entries(data)) {
        next.set(channelId, new Set(keys));
      }
      return { screenShareChannels: next };
    }),
}));
