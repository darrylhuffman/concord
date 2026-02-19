/** Bitmask permission constants */
export const Permission = {
  KICK: 0x01,
  BAN: 0x02,
  MANAGE_CHANNELS: 0x04,
  MANAGE_ROLES: 0x08,
} as const;

/** Check if a bitmask includes a specific permission */
export function hasPermission(bitmask: number, perm: number): boolean {
  return (bitmask & perm) === perm;
}
