/**
 * Public identity store for the server UI.
 * Contains ONLY public information — no secret key, no mnemonic.
 */

import { create } from "zustand";

interface IdentityState {
  publicKey: string | null;
  name: string;
  bio: string;
  setIdentity: (publicKey: string, name: string, bio: string) => void;
  updateProfile: (name: string, bio: string) => void;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  publicKey: null,
  name: "",
  bio: "",
  setIdentity: (publicKey, name, bio) => set({ publicKey, name, bio }),
  updateProfile: (name, bio) => set({ name, bio }),
}));
