import { useEffect, useState } from "react";
import { create } from "zustand";

interface TypingEntry {
  name: string;
  expiresAt: number;
}

interface TypingState {
  channels: Record<string, Record<string, TypingEntry>>;
  addTyping: (channelId: string, publicKey: string, name: string) => void;
  clearTyping: (channelId: string, publicKey: string) => void;
}

export const useTypingStore = create<TypingState>((set) => ({
  channels: {},
  addTyping: (channelId, publicKey, name) =>
    set((state) => {
      const existing = state.channels[channelId] ?? {};
      return {
        channels: {
          ...state.channels,
          [channelId]: {
            ...existing,
            [publicKey]: { name, expiresAt: Date.now() + 3000 },
          },
        },
      };
    }),
  clearTyping: (channelId, publicKey) =>
    set((state) => {
      const existing = state.channels[channelId];
      if (!existing?.[publicKey]) return state;
      const { [publicKey]: _, ...rest } = existing;
      return {
        channels: { ...state.channels, [channelId]: rest },
      };
    }),
}));

interface TypingIndicatorProps {
  channelId: string;
}

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const typingMap = useTypingStore((s) => s.channels[channelId]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!typingMap) return null;

  const now = Date.now();
  const active = Object.values(typingMap).filter((t) => t.expiresAt > now);

  if (active.length === 0) return null;

  let text: string;
  if (active.length === 1) {
    text = `${active[0].name} is typing`;
  } else if (active.length === 2) {
    text = `${active[0].name} and ${active[1].name} are typing`;
  } else {
    text = "Several people are typing";
  }

  return (
    <div className="h-6 px-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="glass flex items-center gap-1.5 rounded-lg px-2 py-1">
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </span>
        <span>{text}...</span>
      </span>
    </div>
  );
}
