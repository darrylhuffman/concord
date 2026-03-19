import { useRef, useEffect, useLayoutEffect, useCallback, memo } from "react";
import { useMessagesStore } from "../../stores/messages";
import { useRealmStore } from "../../stores/realm";
import { useNotificationsStore } from "../../stores/notifications";
import { fetchOlderMessages } from "../../features/connection/realm-handler";
import { ScrollArea } from "../ui/scroll-area";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { Hash, MessageSquare, Loader2 } from "lucide-react";
import type { DisplayMessage } from "../../stores/messages";

const EMPTY_MESSAGES: DisplayMessage[] = [];

interface MessageListProps {
  channelId: string;
  channelName: string;
  isDm?: boolean;
  channelEncrypted?: boolean;
}

export function MessageList({ channelId, channelName, isDm, channelEncrypted }: MessageListProps) {
  const messages = useMessagesStore((s) => s.channels[channelId] ?? EMPTY_MESSAGES);
  const hasMore = useMessagesStore((s) => s.hasMore[channelId] ?? true);
  const isLoading = useMessagesStore((s) => s.loading[channelId] ?? false);
  const markRead = useNotificationsStore((s) => s.markRead);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesRef = useRef<string | null>(null);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    markRead(channelId);
  }, [channelId, markRead]);

  useEffect(() => {
    isInitialLoad.current = true;
    prevMessagesRef.current = null;
    scrollSnapshotRef.current = null;
  }, [channelId]);

  useLayoutEffect(() => {
    if (messages.length === 0) return;

    const firstId = messages[0]?.id;
    const wasInitial = isInitialLoad.current;

    if (wasInitial) {
      isInitialLoad.current = false;
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
        const content = contentRef.current;
        if (content) {
          const ro = new ResizeObserver(() => { el.scrollTop = el.scrollHeight; });
          ro.observe(content);
          setTimeout(() => ro.disconnect(), 2000);
        }
      }
      prevMessagesRef.current = firstId;
      return;
    }

    if (prevMessagesRef.current === firstId) {
      const el = scrollRef.current;
      if (el) {
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
        if (nearBottom) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }

    prevMessagesRef.current = firstId;
  }, [messages]);

  useLayoutEffect(() => {
    const snapshot = scrollSnapshotRef.current;
    const el = scrollRef.current;
    if (!snapshot || !el) return;

    const heightDiff = el.scrollHeight - snapshot.scrollHeight;
    el.scrollTop = snapshot.scrollTop + heightDiff;
    scrollSnapshotRef.current = null;
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || isLoading) return;

    const threshold = el.clientHeight * 1.5;
    if (el.scrollTop < threshold && messages.length > 0) {
      scrollSnapshotRef.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
      };
      const oldestMessage = messages[0];
      fetchOlderMessages(channelId, oldestMessage.createdAt);
    }
  }, [channelId, hasMore, isLoading, messages]);

  return (
    <div className="flex-1 relative min-h-0">
      <ScrollArea
        ref={scrollRef}
        className="h-full px-4 pt-4 pb-20 overflow-y-auto"
        onScroll={handleScroll}
      >
        {isLoading && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="text-4xl mb-4">
              {isDm ? <MessageSquare className="w-16 h-16 text-muted-foreground/30" /> : <Hash className="w-16 h-16 text-muted-foreground/30" />}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {isDm ? `Conversation with ${channelName}` : `Welcome to #${channelName}`}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isDm ? `This is the beginning of your conversation with ${channelName}.` : "This is the beginning of this channel."}
            </p>
          </div>
        )}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-4xl mb-4">
              {isDm ? <MessageSquare className="w-16 h-16 text-muted-foreground/30" /> : <Hash className="w-16 h-16 text-muted-foreground/30" />}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {isDm ? `Conversation with ${channelName}` : `Welcome to #${channelName}`}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isDm ? `This is the beginning of your conversation with ${channelName}.` : "This is the beginning of this channel."}
            </p>
          </div>
        )}
        <div ref={contentRef} className="space-y-0.5">
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showDateDivider = !prev || !isSameDay(prev.createdAt, msg.createdAt);
            const showHeader =
              showDateDivider ||
              prev!.senderPublicKey !== msg.senderPublicKey ||
              msg.createdAt - prev!.createdAt > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showDateDivider && <DateDivider timestamp={msg.createdAt} />}
                <Message message={msg} showHeader={showHeader} />
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0">
        <TypingIndicator channelId={channelId} />
        <MessageInput channelId={channelId} channelName={channelName} channelEncrypted={channelEncrypted} isDm={isDm} />
      </div>
    </div>
  );
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(timestamp, now.getTime())) return "Today";
  if (isSameDay(timestamp, yesterday.getTime())) return "Yesterday";

  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const DateDivider = memo(function DateDivider({ timestamp }: { timestamp: number }) {
  return (
    <div className="flex items-center gap-3 py-4 px-4 -mx-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground shrink-0">{formatDateLabel(timestamp)}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
});
