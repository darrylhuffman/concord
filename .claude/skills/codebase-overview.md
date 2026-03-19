---
name: codebase-overview
description: "Provides a comprehensive overview of the Concord codebase architecture, project structure, and key patterns for agents unfamiliar with the project."
user_invocable: true
---

# Concord Codebase Overview

You are being asked to understand or work within the Concord codebase. This skill gives you the full context you need.

## What Is Concord?

Concord is a decentralized, end-to-end encrypted, self-hosted communication platform (think Discord, but self-hosted and encrypted). Users run their own "realm servers" that host text and voice channels. Clients connect to multiple realms simultaneously. All encryption happens client-side — servers store only ciphertext. User identity is derived from a BIP39 seed phrase (no accounts, no central authority).

## Repository Layout

This is a **pnpm monorepo** rooted at `DeRealm/`. There are two major workspaces:

### 1. `Client/` — The public workspace

Contains everything needed to run the client and self-host a realm server.

#### Shared Packages

- **`Client/packages/protocol/`** (`@concord/protocol`) — Pure TypeScript type definitions shared between client and server. Key files:
  - `commands.ts` — Client-to-server WebSocket message types
  - `events.ts` — Server-to-client WebSocket message types
  - `messages.ts` — `Envelope` (the universal WebSocket message wrapper), `ChatMessage`, `Attachment`
  - `bridge.ts` — PostMessage bridge protocol between Tauri parent and iframe admin UI
  - `permissions.ts` — Role-based permission bitfield flags
  - `channel.ts`, `realm.ts`, `user.ts` — Domain types

- **`Client/packages/crypto/`** (`@concord/crypto`) — All cryptographic operations:
  - `identity.ts` — BIP39 mnemonic → Ed25519 keypair (synchronous via `@scure/bip39`)
  - `signing.ts` — Ed25519 sign/verify (tweetnacl)
  - `encryption.ts` — AES-256-GCM encrypt/decrypt (Web Crypto API)
  - `password.ts` — Argon2id key derivation (hash-wasm)
  - `utils.ts` — base58, hex, UTF-8 encoding

#### Apps

- **`Client/apps/concord-server/`** (`@concord/concord-server`) — The self-hosted realm server:
  - **Backend** (`src/`): Fastify + WebSocket + SQLite. Entry point is `index.ts`.
    - `ws/handler.ts` — The main WebSocket message router. This is the largest and most important server file — handles all command types.
    - `ws/connections.ts` — Connection tracking, broadcast helpers
    - `db/database.ts` — SQLite schema migrations
    - `realm/realm.ts` — Realm metadata, `ensureRealm()` bootstrap
    - `realm/channels.ts` — Channel CRUD
    - `messages/store.ts` — Message persistence
    - `roles/roles.ts` — Role-based access control
    - `invites/invites.ts` — Invite link management
    - `users/bans.ts` — Ban/unban
    - `media/sfu.ts` + `media/rooms.ts` — mediasoup voice/video SFU
  - **Admin UI** (`ui/`): A full Vite + React app that runs inside an iframe in the Tauri client. Communicates with the parent via postMessage bridge. Has its own Zustand stores, websocket client, and crypto bridge. Key difference from the desktop client: identity comes from the parent bridge, not local storage.

- **`Client/apps/client/`** — The Tauri v2 desktop app. **This is a private git submodule** (github.com/letsconcord/concord-app). You will NOT have access to modify this code directly. It contains the React frontend with Zustand stores, connection manager, crypto bridge, voice/video, and the full UI.

### 2. `concord-server/` — The cloud infrastructure (private submodule)

- **`ConcordAPI/`** — Cloud API for managed realm hosting (Fastify + PostgreSQL). Handles Stripe billing, Hetzner Cloud VM provisioning, DNS, Cloudflare R2.
- **`ConcordUI/`** — Landing page (Vite + React, i18n).

## Key Architectural Patterns

### WebSocket Protocol
Every message is an `Envelope`: `{ type, id (UUIDv4), timestamp, payload }`. The flow is:
1. Client connects → sends `user:profile`
2. Server sends `auth:challenge` (nonce)
3. Client signs challenge → sends `auth:response`
4. Server sends `auth:verified`
5. Client sends `realm:join`
6. Server sends `realm:welcome` (full realm state: channels, members, roles, invite links, voice participants)

### Encryption
- Identity: BIP39 mnemonic → Ed25519 keypair. Public key (base58) is the user ID.
- Messages: Layered AES-256-GCM (channel key, then realm key), signed with Ed25519.
- Password verification: Zero-knowledge. Server sends an encrypted sentinel blob. Client decrypts locally to verify the password — server never sees it.
- Invite links: Realm password encrypted with SHA-256(invite UUID key) → carried in URL as `p=ciphertext:nonce`.

### Admin UI Bridge
The server admin UI runs in an iframe inside the Tauri client. Communication happens via `postMessage`:
- Parent → iframe: identity (keys), realm passwords, invite URLs
- Iframe → parent: identity requests, invite generation requests
- Defined in `@concord/protocol/bridge.ts`

### State Management
Zustand stores with `getState()` for non-React access. Both the desktop client and admin UI use this pattern. WebSocket handlers update stores directly without React re-render cycles.

### Database
SQLite with WAL mode. Tables: `realm`, `channels`, `messages` (BLOB content), `attachments`, `user_profiles`, `roles`, `user_roles`, `bans`, `invite_links`.

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm dev:server       # Start realm server (tsx watch)
pnpm dev              # Start dev
```

## Important: What NOT to Touch

- `Client/apps/client/` is a **private submodule** — do not modify or reference its internal structure in PRs to this repo.
- The `concord-server/` submodule is the cloud infrastructure — changes there are separate from the open-source realm server.
