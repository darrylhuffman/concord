import type { Channel } from "@concord/protocol";
import { useIdentityStore } from "../../stores/identity";
import { useMembersStore } from "../../stores/members";
import { Hash, Users, Menu, MessageSquare } from "lucide-react";

interface ChannelHeaderProps {
  channel: Channel;
  realmName: string;
  onToggleSidebar?: () => void;
  onToggleMembers?: () => void;
}

export function ChannelHeader({ channel, realmName, onToggleSidebar, onToggleMembers }: ChannelHeaderProps) {
  const publicKey = useIdentityStore((s) => s.publicKey);
  const members = useMembersStore((s) => s.members);

  const isDm = channel.type === "dm";

  let dmName = "";
  if (isDm && channel.participants) {
    const otherKey = channel.participants.find((k) => k !== publicKey);
    if (otherKey) {
      dmName = members[otherKey]?.name ?? otherKey.slice(0, 8);
    }
  }

  return (
    <div className="h-12 px-4 flex items-center gap-2 border-b border-border shrink-0">
      <button onClick={onToggleSidebar} className="md:hidden p-1.5 rounded hover:bg-accent cursor-pointer">
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>
      {isDm ? (
        <>
          <MessageSquare className="w-5 h-5 text-muted-foreground hidden md:block" />
          <span className="font-semibold text-foreground truncate">{dmName}</span>
        </>
      ) : (
        <>
          <Hash className="w-5 h-5 text-muted-foreground hidden md:block" />
          <span className="font-semibold text-foreground truncate">{channel.name}</span>
        </>
      )}
      {channel.encrypted && (
        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
          Encrypted
        </span>
      )}
      <div className="flex-1" />
      {!isDm && (
        <button onClick={onToggleMembers} className="p-1.5 rounded hover:bg-accent cursor-pointer">
          <Users className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
