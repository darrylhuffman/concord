import { create } from "zustand";

interface AttachmentState {
  pendingFiles: File[];
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
}

export const useAttachmentStore = create<AttachmentState>((set) => ({
  pendingFiles: [],
  addFiles: (files) =>
    set((s) => ({ pendingFiles: [...s.pendingFiles, ...files] })),
  removeFile: (index) =>
    set((s) => ({
      pendingFiles: s.pendingFiles.filter((_, i) => i !== index),
    })),
  clearFiles: () => set({ pendingFiles: [] }),
}));
