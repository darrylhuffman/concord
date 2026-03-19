import { useEffect, useState } from "react";
import {
  initBridge,
  destroyBridge,
  onInit,
  onProfileUpdate,
  isEmbedded,
} from "./features/bridge/iframe-bridge";
import { connect } from "./features/connection/realm-handler";
import { useIdentityStore } from "./stores/identity";
import { useRealmStore } from "./stores/realm";
import { ChannelSidebar } from "./components/realm/ChannelSidebar";
import { MainContent } from "./components/chat/MainContent";
import { MemberSidebar } from "./components/realm/MemberSidebar";

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const status = useRealmStore((s) => s.status);
  const realmName = useRealmStore((s) => s.info.name);
  const realmError = useRealmStore((s) => s.error);
  const identity = useIdentityStore((s) => s.publicKey);

  useEffect(() => {
    initBridge();

    const unsubInit = onInit((data) => {
      useIdentityStore.getState().setIdentity(
        data.publicKey,
        data.name,
        data.bio
      );
      setInitialized(true);
      connect();
    });

    const unsubProfile = onProfileUpdate((name, bio) => {
      useIdentityStore.getState().updateProfile(name, bio);
    });

    return () => {
      unsubInit();
      unsubProfile();
      destroyBridge();
    };
  }, []);

  // Standalone dev mode — not inside iframe
  if (!isEmbedded() && !initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-heading font-bold gradient-text">
            Concord Realm UI
          </h1>
          <p className="text-text-secondary text-sm">
            Running in standalone dev mode.
          </p>
          <p className="text-xs text-muted-foreground">
            To connect, embed this UI in the Tauri shell or provide bridge init data.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
            iframe bridge ready — waiting for parent
          </div>
        </div>
      </div>
    );
  }

  // Waiting for bridge init
  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="text-sm text-muted-foreground">Connecting...</div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
            Waiting for shell
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (status !== "connected") {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-heading font-bold gradient-text">
            {realmName || "Realm"}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                status === "connecting"
                  ? "bg-yellow-500 animate-glow-pulse"
                  : "bg-red-500"
              }`}
            />
            <span className="text-muted-foreground capitalize">{status}</span>
          </div>
          {status === "error" && (
            <p className="text-xs text-destructive">{realmError}</p>
          )}
        </div>
      </div>
    );
  }

  // Connected — 3-panel layout
  return (
    <div className="flex h-screen bg-background text-foreground">
      <ChannelSidebar />
      <MainContent onToggleMembers={() => setShowMembers((v) => !v)} />
      {showMembers && <MemberSidebar />}
    </div>
  );
}
