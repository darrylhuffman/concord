/** User identity derived from Ed25519 public key */
export interface UserProfile {
  publicKey: string;
  name: string;
  bio?: string;
  lastSeen?: number;
  roleId?: string;
}

/** A named role with a permission bitmask */
export interface Role {
  id: string;
  name: string;
  permissions: number;
  sortOrder: number;
}
