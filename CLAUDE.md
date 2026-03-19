# Concord

Decentralized, end-to-end encrypted, self-hosted communication platform. Users run their own "realm servers" that host text and voice channels. Clients connect to multiple realms simultaneously. All encryption happens client-side — servers store only ciphertext. User identity is derived from a BIP39 seed phrase (no accounts, no central authority). Realm discovery happens via RSS feeds.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                            pnpm monorepo                               │
├────────────────────────────────────┬───────────────────────────────────┤
│           Client/ (public)         │    concord-server/ (submodule)    │
├──────────────┬─────────────────────┼───────────────┬──────────────────┤
│ @concord/    │ @concord/           │ ConcordAPI    │ ConcordUI        │
│ protocol     │ crypto              │ (Cloud API)   │ (Landing page)   │
│ (types+      │ (encryption)        │ Fastify +     │ Vite + React     │
│  bridge      │                     │ PostgreSQL    │                  │
│  protocol)   │                     │               │                  │
├──────────────┼─────────────────────┤               │                  │
│ @concord/    │ @concord/client     │               │                  │
│ concord-     │ (Tauri app —        │               │                  │
│ server       │  private submodule) │               │                  │
│  + ui/       │                     │               │                  │
└──────────────┴─────────────────────┴───────────────┴──────────────────┘
```

- **Monorepo**: pnpm workspaces. `Client/` is the public workspace, `concord-server/` is a private submodule.
- **Client workspace** (`Client/`): Shared packages in `packages/`, apps in `apps/`.
  - `@concord/protocol` — Pure TypeScript types, bridge protocol, permissions.
  - `@concord/crypto` — Identity (BIP39), Ed25519 signing, AES-256-GCM encryption, Argon2id.
  - `@concord/concord-server` — Fastify + WebSocket + SQLite realm server, with an embedded admin UI (`ui/`).
  - `@concord/client` — Tauri v2 desktop app (private git submodule, not in this repo).
- **Cloud workspace** (`concord-server/`): `ConcordAPI` (cloud API, provisioning, billing) and `ConcordUI` (landing page).

---

## Quick Reference

### Commands

```bash
pnpm install                    # Install all dependencies
pnpm build                      # Build all packages and apps (pnpm -r build)
pnpm dev:server                 # Start realm server in watch mode (tsx watch)
pnpm dev:client                 # Start client Vite dev server
pnpm dev                        # Start both server and client
pnpm clean                      # Remove all dist/ directories
```

### Running with Tauri

```bash
cd Client/apps/client
pnpm tauri dev                  # Launch Tauri dev window (builds Rust + starts Vite)
pnpm tauri build                # Production build (.msi / .dmg / .AppImage)
```

### Environment Variables (Realm Server)

**Core**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `9000` | Server listen port |
| `HOST` | `0.0.0.0` | Server listen host |
| `REALM_NAME` | `My Realm` | Realm display name |
| `REALM_DESCRIPTION` | `A Concord server` | Realm description |
| `DATA_DIR` | `./data` | SQLite database + file storage directory |
| `REALM_ADMINS` | — | Semicolon-separated public keys of realm admins |

**Encryption**

| Variable | Default | Description |
|---|---|---|
| `REALM_PASSWORD` | — | Plaintext password — automatically derived into a verification blob at startup. Simplest way to enable encryption. |
| `REALM_PASSWORD_VERIFY` | — | Pre-computed password verification blob (hex). Overrides `REALM_PASSWORD` if both are set. |
| `REALM_PASSWORD_VERIFY_NONCE` | — | Nonce for the password verification blob |

**Limits & Retention**

| Variable | Default | Description |
|---|---|---|
| `RETENTION_DAYS` | `null` (forever) | Auto-delete messages older than N days |
| `FILE_RETENTION_DAYS` | `null` (forever) | Auto-delete files older than N days |
| `MAX_FILE_SIZE` | `52428800` (50MB) | Maximum upload file size in bytes |
| `MAX_MEMBERS` | `0` (unlimited) | Maximum concurrent members |
| `MAX_STORAGE_BYTES` | `0` (unlimited) | Maximum total storage in bytes |
| `MAX_VOICE_PARTICIPANTS` | `0` (unlimited) | Maximum voice channel participants |
| `ALLOW_DM` | `false` | Set to `true` to enable direct messages |

**Voice / Media (mediasoup)**

| Variable | Default | Description |
|---|---|---|
| `MEDIASOUP_LISTEN_IP` | `0.0.0.0` | mediasoup RTP listen IP |
| `MEDIASOUP_ANNOUNCED_IP` | auto-detected | Public IP for ICE candidates |
| `STUN_SERVERS` | `stun:stun.l.google.com:19302` | Comma-separated STUN server URLs |
| `TURN_SERVERS` | — | Comma-separated TURN server URLs |
| `TURN_USERNAME` | — | TURN authentication username |
| `TURN_CREDENTIAL` | — | TURN authentication credential |

**S3 Storage (optional — falls back to local disk)**

| Variable | Default | Description |
|---|---|---|
| `S3_BUCKET` | — | S3 bucket name (setting this enables S3 storage) |
| `S3_ENDPOINT` | — | S3-compatible endpoint URL |
| `S3_REGION` | `auto` | S3 region |
| `S3_ACCESS_KEY` | — | S3 access key |
| `S3_SECRET_KEY` | — | S3 secret key |

### Docker Deployment

**Quick start with Docker Compose** (recommended):

```bash
cd Client/apps/concord-server
# Create your .env file
echo "REALM_NAME=My Realm" > .env
echo "REALM_PASSWORD=supersecret" >> .env
# Build and run
docker compose up -d
```

**Standalone Docker run:**

```bash
docker build -t concord-server -f Client/apps/concord-server/Dockerfile Client/

docker run -d \
  --name concord \
  -p 9000:9000 \
  -p 10000-10100:10000-10100/udp \
  -v concord_data:/data \
  -e REALM_NAME="My Realm" \
  -e REALM_PASSWORD="supersecret" \
  -e REALM_ADMINS="your_base58_public_key" \
  concord-server
```

The server derives the encryption key from `REALM_PASSWORD` automatically at startup (Argon2id). No need to pre-compute verification blobs.

### Requirements

- Node.js >= 20
- pnpm >= 9
- Rust toolchain (for Tauri builds)

---

## Project Structure

```
DeRealm/
├── Client/                              # Public workspace — shared packages + realm server
│   ├── packages/
│   │   ├── protocol/                    # @concord/protocol — shared type definitions
│   │   │   └── src/
│   │   │       ├── index.ts             # Re-exports all types
│   │   │       ├── bridge.ts            # Parent ↔ iframe bridge message protocol
│   │   │       ├── channel.ts           # Channel, ChannelType
│   │   │       ├── commands.ts          # Client→Server command types
│   │   │       ├── events.ts            # Server→Client event types
│   │   │       ├── messages.ts          # Envelope, ChatMessage, Attachment, MessageProfile
│   │   │       ├── permissions.ts       # Role-based permission flags (bitfield)
│   │   │       ├── realm.ts             # RealmInfo, RealmWelcome
│   │   │       └── user.ts             # UserProfile
│   │   │
│   │   └── crypto/                      # @concord/crypto — cryptographic primitives
│   │       └── src/
│   │           ├── index.ts             # Re-exports all crypto functions
│   │           ├── identity.ts          # BIP39 mnemonic → Ed25519 keypair
│   │           ├── signing.ts           # Ed25519 sign/verify (tweetnacl)
│   │           ├── encryption.ts        # AES-256-GCM encrypt/decrypt (Web Crypto API)
│   │           ├── password.ts          # Argon2id key derivation (hash-wasm)
│   │           └── utils.ts             # base58, hex, UTF-8 encoding helpers
│   │
│   ├── apps/
│   │   ├── concord-server/              # @concord/concord-server — self-hosted realm server
│   │   │   ├── src/
│   │   │   │   ├── index.ts             # Entry: Fastify + WebSocket + routes + cron
│   │   │   │   ├── config.ts            # Environment-based ServerConfig
│   │   │   │   ├── db/
│   │   │   │   │   └── database.ts      # SQLite init + schema migrations
│   │   │   │   ├── ws/
│   │   │   │   │   ├── handler.ts       # WebSocket message router + command handlers
│   │   │   │   │   ├── connections.ts   # Connection tracking + broadcast helpers
│   │   │   │   │   └── rate-limit.ts    # Sliding window rate limiter
│   │   │   │   ├── realm/
│   │   │   │   │   ├── realm.ts         # Realm metadata + ensureRealm()
│   │   │   │   │   └── channels.ts      # Channel CRUD + default channels
│   │   │   │   ├── messages/
│   │   │   │   │   ├── store.ts         # Message persistence + history retrieval
│   │   │   │   │   └── retention.ts     # Hourly auto-prune of expired messages
│   │   │   │   ├── files/
│   │   │   │   │   ├── upload.ts        # Multipart file upload/download routes
│   │   │   │   │   └── delete.ts        # File deletion + storage cleanup
│   │   │   │   ├── rss/
│   │   │   │   │   └── feed.ts          # Atom feed at GET /rss
│   │   │   │   ├── media/
│   │   │   │   │   ├── sfu.ts           # mediasoup Worker/Router setup
│   │   │   │   │   └── rooms.ts         # Voice room management
│   │   │   │   ├── users/
│   │   │   │   │   ├── cache.ts         # User profile upsert/get cache
│   │   │   │   │   └── bans.ts          # Ban/unban management
│   │   │   │   ├── roles/
│   │   │   │   │   └── roles.ts         # Role CRUD + permission enforcement
│   │   │   │   └── invites/
│   │   │   │       └── invites.ts       # Invite link generation + validation
│   │   │   │
│   │   │   └── ui/                      # Server admin UI (embedded Vite + React app)
│   │   │       └── src/
│   │   │           ├── App.tsx           # Root component
│   │   │           ├── main.tsx          # Entry point
│   │   │           ├── components/
│   │   │           │   ├── chat/         # MainContent, Message, MessageInput, MessageList,
│   │   │           │   │                 #   ChannelHeader, TypingIndicator
│   │   │           │   ├── realm/        # ChannelSidebar, MemberSidebar, CreateChannelDialog,
│   │   │           │   │                 #   RealmSettingsDialog, RealmDetailsDialog, RoleEditor
│   │   │           │   ├── profile/      # UserProfilePopover
│   │   │           │   ├── voice/        # VoiceChannel, VoiceControls, ParticipantTile,
│   │   │           │   │                 #   VideoGrid, VideoElement, AudioConsumers,
│   │   │           │   │                 #   SpeakingDetector, VoiceChannelParticipants
│   │   │           │   └── ui/           # Primitives: avatar, button, context-menu, dialog,
│   │   │           │                     #   image-lightbox, input, popover, scroll-area, select
│   │   │           ├── features/
│   │   │           │   ├── bridge/       # iframe-bridge.ts — postMessage bridge to parent (Tauri)
│   │   │           │   ├── connection/   # websocket-client.ts, realm-handler.ts
│   │   │           │   ├── crypto/       # bridge.ts — encrypt/decrypt/sign/verify
│   │   │           │   ├── files/        # upload.ts — file upload handling
│   │   │           │   └── media/        # voice.ts, sounds.ts — mediasoup + notifications
│   │   │           ├── stores/           # Zustand: identity, realm, messages, members,
│   │   │           │                     #   voice, roles, notifications, attachments, toasts
│   │   │           ├── lib/              # utils.ts, role-color.ts, clipboard.ts
│   │   │           └── styles/           # TailwindCSS v4
│   │   │
│   │   └── client/                      # @concord/client — Tauri desktop app [PRIVATE SUBMODULE]
│   │                                    #   (git submodule → github.com/letsconcord/concord-app)
│   │
│   ├── utils/
│   │   └── generate-password-verify.ts  # CLI tool to pre-compute password verification blobs
│   │
│   ├── package.json                     # Client workspace root (concord-client-workspace)
│   ├── pnpm-workspace.yaml              # packages: ["packages/*", "apps/*"]
│   └── tsconfig.base.json               # Shared TypeScript config
│
├── concord-server/                      # Cloud infrastructure [PRIVATE SUBMODULE]
│   │                                    #   (git submodule → github.com/darrylhuffman/concord-server)
│   ├── ConcordAPI/                      # Cloud API (Fastify + PostgreSQL)
│   │   └── src/
│   │       ├── index.ts                 # Entry: Fastify server
│   │       ├── config.ts                # Environment config
│   │       ├── types.ts                 # Shared types
│   │       ├── auth/
│   │       │   ├── routes.ts            # Challenge-response auth endpoints
│   │       │   └── middleware.ts        # Auth middleware
│   │       ├── billing/
│   │       │   ├── stripe.ts            # Stripe integration
│   │       │   └── webhooks.ts          # Stripe webhook handlers
│   │       ├── db/
│   │       │   └── pool.ts              # PostgreSQL connection pool
│   │       ├── monitoring/
│   │       │   └── health-checker.ts    # Realm health monitoring
│   │       ├── provisioning/
│   │       │   ├── orchestrator.ts      # Realm provisioning orchestrator
│   │       │   ├── hetzner.ts           # Hetzner Cloud VM management
│   │       │   ├── dns.ts               # DNS record management
│   │       │   ├── cloudflare-r2.ts     # Cloudflare R2 storage
│   │       │   ├── cloud-init.ts        # VM bootstrap scripts
│   │       │   └── locations.ts         # Datacenter locations
│   │       ├── realms/
│   │       │   ├── routes.ts            # Realm CRUD endpoints
│   │       │   └── tiers.ts             # Hosting tier definitions
│   │       └── utils/
│   │           └── crypto-utils.ts      # Inlined verify/fromBase58/fromHex
│   │
│   └── ConcordUI/                       # Landing page (Vite + React)
│       └── src/
│           ├── App.tsx, main.tsx
│           ├── components/              # LanguageSelector, ShaderCanvas
│           ├── hooks/                   # usePlatform.ts
│           ├── i18n/                    # Internationalization
│           └── pages/                   # NewLanding.tsx, RealmSetup.tsx
│
├── package.json                         # Root orchestrator (scripts: build, dev, dev:server, dev:client, clean)
├── pnpm-workspace.yaml                  # Workspaces: Client, Client/packages/*, Client/apps/*, Client/apps/concord-server/ui
├── .npmrc                               # shamefully-hoist=true
├── .gitmodules                          # Submodules: Client/apps/client, concord-server
└── CLAUDE.md
```

---

## Protocol Design

Every WebSocket message follows the `Envelope` shape:

```typescript
interface Envelope {
  type: string;       // e.g. "channel:message", "realm:welcome"
  id: string;         // UUIDv4 for deduplication
  timestamp: number;  // Unix ms
  payload: unknown;   // Type-specific data
}
```

### Message Flow

```
Client                          Server
  │                               │
  ├─ user:profile ───────────────►│  (identify yourself)
  │◄──────────── auth:challenge ──┤  (nonce for Ed25519 signature)
  ├─ auth:response ──────────────►│  (signed challenge)
  │◄──────────── auth:verified ───┤  (identity confirmed)
  ├─ realm:join ─────────────────►│  (request realm info)
  │◄──────────── realm:welcome ───┤  (realm, channels, members, roles)
  ├─ channel:join ───────────────►│  (join a channel)
  │◄──────────── channel:history ─┤  (past messages)
  ├─ channel:message ────────────►│  (send encrypted message)
  │◄──────────── channel:message ─┤  (broadcast to channel)
```

### Authentication

Challenge-response protocol using Ed25519 signatures:
- Realm server challenge: `concord:auth:${nonce}:${publicKey}`
- Cloud API challenge: `concord:api:${nonce}:${publicKey}`

### Command Types (Client → Server)

| Type | Payload | Description |
|---|---|---|
| `realm:join` | `{}` | Join the realm |
| `realm:leave` | `{}` | Leave the realm |
| `channel:join` | `{ channelId }` | Join a channel (get history) |
| `channel:message` | `{ channelId, encrypted, signature, nonce, publicKey, profile }` | Send encrypted message |
| `channel:typing` | `{ channelId, publicKey }` | Typing indicator |
| `channel:file` | `{ channelId, fileId, filename, mimeType, size }` | File reference after HTTP upload |
| `user:profile` | `{ publicKey, name, bio }` | Set user profile |
| `voice:join` | `{ channelId }` | Join voice channel |
| `voice:leave` | `{ channelId }` | Leave voice channel |
| `voice:produce` | `{ kind, rtpParameters }` | Start producing audio/video |
| `voice:consume` | `{ producerId }` | Start consuming a producer |

### Event Types (Server → Client)

| Type | Payload | Description |
|---|---|---|
| `auth:challenge` | `{ nonce }` | Challenge nonce for identity proof |
| `auth:verified` | `{}` | Identity confirmed, can now join realm |
| `realm:welcome` | `{ realm, channels, members, roles, inviteLinks, voiceParticipants, ... }` | Full realm state on join |
| `realm:error` | `{ code, message }` | Error response |
| `channel:history` | `{ channelId, messages[] }` | Past messages |
| `channel:message` | `{ channelId, message, profile }` | New message broadcast |
| `channel:typing` | `{ channelId, publicKey, name }` | Typing broadcast |
| `member:join` | `{ member }` | New member connected |
| `member:leave` | `{ publicKey }` | Member disconnected |
| `member:kicked` | `{ publicKey }` | Member was kicked |
| `member:banned` | `{ publicKey }` | Member was banned |
| `voice:joined` | `{ rtpCapabilities }` | Voice channel joined |
| `voice:produced` | `{ producerId }` | Producer created |
| `voice:consumed` | `{ consumerId, rtpParameters }` | Consumer created |
| `role:create` | `{ role }` | Role created |
| `role:update` | `{ role }` | Role updated |
| `role:delete` | `{ roleId }` | Role deleted |
| `invite:regenerated` | `{ inviteLinks }` | Invite links regenerated |

---

## Encryption Architecture

### Identity

```
BIP39 mnemonic (24 words)
    │
    ▼
mnemonicToSeedSync() → 64-byte seed
    │
    ▼
first 32 bytes → Ed25519 keypair (tweetnacl)
    │
    ├── publicKey  → base58 string (user identifier)
    └── secretKey  → never leaves client
```

Uses `@scure/bip39` (browser-native, no Node.js Buffer dependency). The `identityFromMnemonic()` function is **synchronous**.

### Message Encryption (Layered)

```
Plaintext
    │
    ▼ (if channel has password)
AES-256-GCM(channelKey, plaintext) → inner ciphertext
    │
    ▼ (if realm has password)
AES-256-GCM(realmKey, inner) → outer ciphertext
    │
    ▼
Ed25519.sign(ciphertext, secretKey) → signature
    │
    ▼
Send { encrypted: outerCiphertext, nonce: "realmNonce:channelNonce", signature }
```

- **Realm encryption**: `password → Argon2id(password, realmId) → 256-bit realmKey`
- **Channel encryption**: `password → Argon2id(password, channelId) → 256-bit channelKey`
- **Nonce format**: When both layers are active, nonces are packed as `realmNonce:channelNonce` (colon-separated hex strings)
- **Signing**: Ed25519 detached signature over the ciphertext. Recipients verify against the sender's public key.
- **Password verification**: Uses `CONCORD_VERIFY` sentinel encrypted with `concord:verify` salt
- **Client-side zero-knowledge verification**: On `realm:welcome`, the client receives `passwordVerify` + `passwordVerifyNonce`. It attempts to decrypt the sentinel with its derived key — the server never sees the password.

### Invite Link Encryption

Invite links carry an encrypted realm password:
1. Server stores invite links with a UUID `key` in the database
2. Invite URL: `https://app.letsconcord.com/join?realm=ADDRESS&invite=ID&p=CIPHERTEXT:NONCE`
3. Client fetches `GET /invite/:id` → gets the `key` UUID
4. `SHA-256(key)` → 32-byte AES key → decrypt ciphertext → realm password
5. Non-encrypted realms omit the `p=` param

### Profile Backup Bundles

Exportable `.concord` files with format marker `{ concord: 1 }`. Encrypted with Argon2id using `concord:backup:${saltHex}` salt.

### Key Libraries

| Library | Purpose | Why |
|---|---|---|
| `@scure/bip39` | Mnemonic generation | Browser-native, no Buffer polyfill needed |
| `tweetnacl` | Ed25519 sign/verify | Pure JS, audited, fast |
| Web Crypto API | AES-256-GCM | Native, hardware-accelerated |
| `hash-wasm` | Argon2id | WASM, works in browser + Node.js |
| `bs58` | Base58 encoding | Compact public key representation |

---

## Database (Realm Server — SQLite)

```sql
realm              -- Single row: id, name, description, encrypted, retention_days
channels           -- id, name, type (text|voice), encrypted, position
messages           -- id, channel_id, sender_public_key, content (BLOB), signature, nonce
  └── INDEX        -- (channel_id, created_at) for efficient history queries
attachments        -- id, message_id, filename, mime_type, size, storage_path
user_profiles      -- public_key (PK), name, bio, last_seen
roles              -- id, realm_id, name, color, permissions (bitfield), position
user_roles         -- user_public_key, role_id
bans               -- public_key, reason, created_at
invite_links       -- id, key (UUID), created_at
```

- WAL mode enabled for concurrent reads
- Foreign keys enforced
- Messages table stores encrypted ciphertext as BLOB — server cannot read content
- Retention cron runs hourly, deletes messages older than `retention_days`

---

## Server HTTP Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/ws` | WebSocket upgrade endpoint |
| `POST` | `/files` | Multipart file upload (returns `{ id, url }`) |
| `GET` | `/files/:id` | File download |
| `GET` | `/rss` | Atom feed with realm metadata |
| `GET` | `/health` | Health check (returns `{ status, realm }`) |
| `GET` | `/invite/:id` | Retrieve invite link key for password decryption |

---

## Server Admin UI

The realm server embeds a browser-based admin UI at `Client/apps/concord-server/ui/`. It runs inside an iframe in the Tauri desktop client and communicates via `postMessage` bridge protocol (defined in `@concord/protocol/bridge.ts`).

### Bridge Architecture

```
Tauri Desktop Client (parent)
    │
    ├── parent-bridge.ts          # Handles messages FROM iframe
    │     • Provides identity (keys, profile)
    │     • Generates invite URLs (encrypts realm password)
    │     • Forwards realm passwords for decryption
    │
    ▼ postMessage
    │
Server Admin UI (iframe)
    │
    └── iframe-bridge.ts          # Handles messages FROM parent
          • Requests identity on load
          • Sends invite URL generation requests
          • Receives encrypted realm password
```

### Key Differences from Desktop Client
- **No local storage** — identity comes from the parent bridge
- **Single realm** — always connected to the hosting realm server
- **Admin capabilities** — channel CRUD, role management, member moderation, invite management

---

## Permissions System

Role-based permissions using a bitfield (`@concord/protocol/permissions.ts`):

| Permission | Bit | Description |
|---|---|---|
| `MANAGE_CHANNELS` | `1 << 0` | Create/edit/delete channels |
| `MANAGE_MEMBERS` | `1 << 1` | Kick/ban members |
| `MANAGE_ROLES` | `1 << 2` | Create/edit/delete roles |
| `MANAGE_REALM` | `1 << 3` | Edit realm settings |
| `ADMINISTRATOR` | `1 << 4` | Full permissions |

Admins (listed in `REALM_ADMINS` env var) bypass all permission checks.

---

## Voice/Video (mediasoup SFU)

```
Client A ──[audio/video]──► mediasoup Router ──► Client B
                                    │
                                    └──► Client C
```

- Server creates one **mediasoup Worker** per CPU core
- Each voice channel maps to a **Router**
- Clients create **SendTransport** (produce) and **RecvTransport** (consume)
- RTP ports: 10000–10100
- Codecs: Opus (audio, payloadType 111), VP8 (video, payloadType 96)
- Screen sharing supported via separate video producer

---

## RSS Discovery

Realm servers expose an Atom feed at `GET /rss` with realm metadata (name, description, channel count, member count). Clients have a Discover panel where users add RSS feed URLs to browse and join realms. URLs use the `concord://` protocol scheme.

---

## Cloud Infrastructure (concord-server/)

The cloud API provides managed realm hosting:

- **Authentication**: Challenge-response (same Ed25519 identity as realm auth)
- **Billing**: Stripe subscriptions with tiered plans
- **Provisioning**: Hetzner Cloud VMs, Cloudflare R2 storage, automated DNS
- **Monitoring**: Health checks for hosted realms
- **Landing page**: `ConcordUI` — React SPA with i18n, shader background, platform detection

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| BIP39 library | `@scure/bip39` (not `bip39`) | Browser-native, no Node.js Buffer polyfill needed |
| Identity derivation | Synchronous (`mnemonicToSeedSync`) | Simpler API, no async in component initialization |
| Encryption | Web Crypto API (AES-256-GCM) | Native, hardware-accelerated, available in browser + Tauri |
| Tauri version | v2 | Capabilities-based permissions, stable plugin ecosystem |
| TailwindCSS version | v4 | Uses `@import "tailwindcss"` and `@theme` in CSS, no config file |
| TypeScript | Strict mode, ES2022, bundler module resolution | Maximum type safety, modern JS features |
| Database | SQLite (better-sqlite3) with WAL | Zero-config, embedded, synchronous API for self-hosting |
| ConcordAPI crypto | Inlined (no @concord/crypto dep) | Server decoupled from client packages for independent deployment |
| Password verification | Client-side zero-knowledge | Server sends verification blob, client decrypts locally — server never sees password |
| Admin UI | Embedded iframe + postMessage bridge | Reuses realm server connection, isolated from client state |

---

## Important Patterns

### Strict TypeScript + Web Crypto

The `encryption.ts` module uses an `asBuffer()` helper to convert `Uint8Array` to `ArrayBuffer` for Web Crypto API compatibility under strict TypeScript:

```typescript
function asBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}
```

### Crypto Bridge Key Caching

`features/crypto/bridge.ts` caches derived encryption keys (`password:salt → Uint8Array`) to avoid re-running Argon2id (which is intentionally expensive) on every message.

### Rate Limiting

Server uses a sliding window rate limiter: 30 messages per 10-second window per connection. Exceeding the limit returns a `realm:error` with code `RATE_LIMITED`.

### Message Signing Flow

1. Client encrypts plaintext → ciphertext
2. Client signs ciphertext with Ed25519 secret key → hex signature
3. Server stores ciphertext + signature (cannot read or forge)
4. Recipient verifies signature against sender's public key
5. Recipient decrypts ciphertext → plaintext

---

## File Attachments

1. Client uploads file via `POST /files` (multipart form data)
2. Server returns `{ id, url }`
3. Client sends `channel:file` command with file metadata
4. Message content references file as `[file:id:filename]`
5. Message component detects file pattern, renders image preview or download link

---

## Default Channels

On first boot, the realm server creates:
- `#general` (text, position 0)
- `#random` (text, position 1)
- `Lounge` (voice, position 0)

---

## Theming

TailwindCSS v4 with `@theme` directive in `globals.css`. No `tailwind.config` file — everything is in CSS.

- **Light mode**: White/gray backgrounds, dark text
- **Dark mode** (`.dark` class): Deep blue-black backgrounds (`hsl(224 15% 8%)`), purple accent (`hsl(263 70% 58%)`)
- Sidebar has its own color tokens (`--color-sidebar-*`)
- Border radius: `0.5rem`
- System font stack: `system-ui, -apple-system, sans-serif`

Dark mode is the intended primary theme for this app.
