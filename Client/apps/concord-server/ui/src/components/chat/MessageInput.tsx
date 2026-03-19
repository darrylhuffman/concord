/**
 * MessageInput for server UI.
 *
 * Key adaptation: signing is delegated to parent via bridge.requestSign()
 * instead of using the secret key directly.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useIdentityStore } from "../../stores/identity";
import { useRealmStore } from "../../stores/realm";
import { useAttachmentStore } from "../../stores/attachments";
import { getWebSocketClient } from "../../features/connection/realm-handler";
import { encryptMessage } from "../../features/crypto/bridge";
import { requestSign, getKeys } from "../../features/bridge/iframe-bridge";
import { uploadFile, uploadEncryptedFile } from "../../features/files/upload";
import { Paperclip, X, FileIcon } from "lucide-react";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function isImageFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTS.has(ext) || file.type.startsWith("image/");
}

interface MessageInputProps {
  channelId: string;
  channelName: string;
  channelEncrypted?: boolean;
  isDm?: boolean;
}

export function MessageInput({ channelId, channelName, channelEncrypted, isDm }: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const identityPublicKey = useIdentityStore((s) => s.publicKey);
  const identityName = useIdentityStore((s) => s.name);
  const identityBio = useIdentityStore((s) => s.bio);
  const realmInfo = useRealmStore((s) => s.info);
  const lastTypingSent = useRef(0);

  const pendingFiles = useAttachmentStore((s) => s.pendingFiles);
  const addFiles = useAttachmentStore((s) => s.addFiles);
  const removeFile = useAttachmentStore((s) => s.removeFile);
  const clearFiles = useAttachmentStore((s) => s.clearFiles);

  const previews = useMemo(() => {
    return pendingFiles.map((file) => ({
      file,
      isImage: isImageFile(file),
      url: isImageFile(file) ? URL.createObjectURL(file) : null,
    }));
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      for (const p of previews) {
        if (p.url) URL.revokeObjectURL(p.url);
      }
    };
  }, [previews]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 500) + "px";
  }, [text]);

  function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;

    const client = getWebSocketClient();
    client?.send("channel:typing", {
      channelId,
      publicKey: identityPublicKey ?? "",
    });
  }

  function insertAtCursor(str: string) {
    const el = inputRef.current;
    if (!el) {
      setText((prev) => prev + str);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newText = before + str + after;
    setText(newText);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + str.length;
      el.focus();
    });
  }

  async function handleSend() {
    const content = text.trim();
    if ((!content && pendingFiles.length === 0) || !identityPublicKey || sending) return;

    setSending(true);
    try {
      const keys = getKeys();
      const realmKey = keys.realmKey;
      const channelKey = channelEncrypted ? (keys.channelKeys.get(channelId) ?? null) : null;
      const effectiveKey = channelKey ?? realmKey ?? null;

      // Upload files
      const fileRefs: string[] = [];
      for (const file of pendingFiles) {
        const result = effectiveKey
          ? await uploadEncryptedFile(file, effectiveKey)
          : await uploadFile(file);
        fileRefs.push(`[file:${result.id}:${result.filename}]`);
      }
      clearFiles();

      const parts = [content, ...fileRefs].filter(Boolean);
      const messageText = parts.join("\n");
      const { encrypted, nonce } = await encryptMessage(messageText, realmKey, channelKey);

      // Sign via parent bridge (secret key never leaves shell)
      const signature = await requestSign(encrypted);

      const client = getWebSocketClient();
      client?.send("channel:message", {
        channelId,
        encrypted,
        signature,
        nonce,
        publicKey: identityPublicKey,
        profile: {
          publicKey: identityPublicKey,
          name: identityName,
          bio: identityBio,
        },
      });

      setText("");
    } catch (err) {
      console.error("[MessageInput] Send failed:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function wrapSelection(prefix: string, suffix: string = prefix) {
    const el = inputRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);

    if (before.endsWith(prefix) && after.startsWith(suffix)) {
      const newText = before.slice(0, -prefix.length) + selected + after.slice(suffix.length);
      setText(newText);
      requestAnimationFrame(() => {
        el.selectionStart = start - prefix.length;
        el.selectionEnd = end - prefix.length;
      });
      return;
    }

    const newText = before + prefix + selected + suffix + after;
    setText(newText);
    requestAnimationFrame(() => {
      el.selectionStart = start + prefix.length;
      el.selectionEnd = end + prefix.length;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    if (e.key === "b") { e.preventDefault(); wrapSelection("**"); }
    else if (e.key === "i") { e.preventDefault(); wrapSelection("*"); }
    else if (e.key === "e") { e.preventDefault(); wrapSelection("`"); }
    else if (e.key === "X" && e.shiftKey) { e.preventDefault(); wrapSelection("~~"); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
    e.target.value = "";
  }

  return (
    <div className="px-1.5 pb-1.5 pt-0.5 shrink-0">
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {previews.map((p, i) =>
            p.isImage && p.url ? (
              <div key={i} className="relative group rounded-lg bg-secondary">
                <img src={p.url} alt={p.file.name} className="object-contain rounded-lg" style={{ maxHeight: 100, maxWidth: 100 }} />
                <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div key={i} className="relative group flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                <FileIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground truncate max-w-[120px]">{p.file.name}</span>
                <span className="text-muted-foreground text-xs">{(p.file.size / 1024).toFixed(1)} KB</span>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="flex items-end gap-2 glass rounded-lg px-4 py-2.5 transition-colors focus-within:ring-1 focus-within:ring-ring/50">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer">
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); emitTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder={isDm ? `Message ${channelName}` : `Message #${channelName}`}
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-[500px] overflow-y-auto py-0.5"
        />
      </div>
    </div>
  );
}
