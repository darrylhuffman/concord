import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useRealmStore } from "../../stores/realm";
import { useMembersStore } from "../../stores/members";
import { getRealmAddress, requestInviteUrl, onInviteUrl } from "../../features/bridge/iframe-bridge";
import { getWebSocketClient } from "../../features/connection/realm-handler";
import { copyText } from "../../lib/clipboard";
import { Check, Copy, Lock, Share2, RefreshCw } from "lucide-react";

interface RealmDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RealmDetailsDialog({ open, onOpenChange }: RealmDetailsDialogProps) {
  const realmInfo = useRealmStore((s) => s.info);
  const channels = useRealmStore((s) => s.channels);
  const inviteLinks = useRealmStore((s) => s.inviteLinks);
  const isAdmin = useRealmStore((s) => s.isAdmin);
  const membersRecord = useMembersStore((s) => s.members);
  const onlineKeys = useMembersStore((s) => s.onlineKeys);
  const [copied, setCopied] = useState<"address" | "invite" | false>(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [encryptedShareUrl, setEncryptedShareUrl] = useState<string | null>(null);

  const realmAddress = getRealmAddress();
  const memberCount = Object.keys(membersRecord).length;
  const onlineCount = onlineKeys.size;
  const textCount = channels.filter((c) => c.type === "text").length;
  const voiceCount = channels.filter((c) => c.type === "voice").length;
  const invite = inviteLinks?.[0];

  // Request encrypted invite URL from parent when dialog opens
  useEffect(() => {
    if (!open || !invite) {
      setEncryptedShareUrl(null);
      return;
    }

    const unsub = onInviteUrl((url) => {
      setEncryptedShareUrl(url);
    });

    requestInviteUrl(invite.id, invite.key);

    return unsub;
  }, [open, invite?.id, invite?.key]);

  function handleCopy(text: string, which: "address" | "invite") {
    copyText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRegenerate() {
    if (!invite) return;
    const client = getWebSocketClient();
    client?.send("invite:regenerate", { inviteId: invite.id });
    setConfirmRegenerate(false);
    setEncryptedShareUrl(null);
  }

  // Use the encrypted URL if available, otherwise plain invite URL
  const shareUrl = encryptedShareUrl
    ?? (invite
      ? `https://app.letsconcord.com/join?realm=${encodeURIComponent(realmAddress)}&invite=${invite.id}`
      : realmAddress);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmRegenerate(false); }}>
      <DialogContent className="w-[400px] bg-[rgba(5,8,16,0.75)] backdrop-blur-[16px] backdrop-saturate-[1.8]">
        <DialogHeader>
          <DialogTitle>{realmInfo.name}</DialogTitle>
          {realmInfo.description && (
            <DialogDescription>{realmInfo.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/40 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{onlineCount}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{memberCount}</div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{textCount}</div>
              <div className="text-xs text-muted-foreground">Text Channels</div>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2">
              <div className="text-lg font-bold text-foreground">{voiceCount}</div>
              <div className="text-xs text-muted-foreground">Voice Channels</div>
            </div>
          </div>

          {realmInfo.encrypted && (
            <div className="flex items-center gap-2 text-xs text-identity">
              <Lock className="w-3.5 h-3.5" />
              This realm is password-protected. All messages are encrypted.
            </div>
          )}

          {/* Realm address */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Realm Address
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-foreground bg-secondary px-3 py-2 rounded-md truncate">
                {realmAddress}
              </code>
              <button
                onClick={() => handleCopy(realmAddress, "address")}
                className="p-2 rounded-md hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {copied === "address" ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Share this address to let others connect directly.
            </p>
          </div>

          {/* Invite / Share link */}
          {invite && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Share2 className="w-3 h-3 inline mr-1" />
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-foreground bg-secondary px-3 py-2 rounded-md truncate">
                  {shareUrl}
                </code>
                <button
                  onClick={() => handleCopy(shareUrl, "invite")}
                  className="p-2 rounded-md hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {copied === "invite" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {realmInfo.encrypted
                  ? "This link includes an encrypted password — recipients can join without entering it manually."
                  : "Share this link to invite others to join this realm."}
              </p>

              {/* Admin: regenerate invite */}
              {isAdmin && (
                <div className="pt-1">
                  {confirmRegenerate ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-destructive flex-1">
                        This will invalidate the current invite link. Continue?
                      </p>
                      <Button variant="destructive" size="sm" onClick={handleRegenerate}>
                        Regenerate
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmRegenerate(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRegenerate(true)}
                      className="gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate Invite
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
