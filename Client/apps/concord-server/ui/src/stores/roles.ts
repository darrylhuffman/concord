/**
 * Roles store for the server UI.
 * Simplified single-realm version.
 */

import { create } from "zustand";
import type { Role } from "@concord/protocol";

interface RolesState {
  roles: Role[];
  myPermissions: number;
  setRoles: (roles: Role[]) => void;
  setMyPermissions: (perms: number) => void;
  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
  deleteRole: (roleId: string) => void;
  reorderRoles: (roles: Role[]) => void;
}

export const useRolesStore = create<RolesState>((set) => ({
  roles: [],
  myPermissions: 0,

  setRoles: (roles) => set({ roles }),
  setMyPermissions: (perms) => set({ myPermissions: perms }),

  addRole: (role) =>
    set((state) => ({ roles: [...state.roles, role] })),

  updateRole: (role) =>
    set((state) => ({
      roles: state.roles.map((r) => (r.id === role.id ? role : r)),
    })),

  deleteRole: (roleId) =>
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== roleId),
    })),

  reorderRoles: (roles) => set({ roles }),
}));
