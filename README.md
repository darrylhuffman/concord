# <img src="icon.svg" width="32" height="32" alt="Concord" /> Concord

**ENCRYPTED · DECENTRALIZED · PRIVATE**

### Your Conversations.<br>Your Servers.<br>Your Keys.

Communication that belongs to you.

Every message and file is end-to-end encrypted. Group chat, voice, and video. Host your own server or use ours. No accounts — just a seed phrase and math.

---

## Features

| | |
|---|---|
| **End-to-End Encrypted** | Messages & files, AES-256-GCM |
| **Zero Knowledge** | Servers see only ciphertext |
| **Self-Hosted** | Run it on your own hardware |
| **Open Source** | MIT licensed, always |

### It just works

**Text, voice, video — without the hassle.**

- Text channels for organized conversations across all your communities
- Crystal-clear voice and video calls via modern SFU architecture
- Screen sharing and encrypted file attachments, built right in

---

## Quick Start

### One command. Your server.

Concord's realm server is a single container. No microservices. No Kubernetes. No PhD required.

```bash
docker run -d -p 9000:9000 \
  -v realm-data:/data \
  -e REALM_NAME="My Community" \
  concord/server
```

### Run from source

```bash
git clone https://github.com/user/concord-server.git
cd concord-server
pnpm install
pnpm build
pnpm start
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `9000` | Server listen port |
| `HOST` | `0.0.0.0` | Server listen host |
| `REALM_NAME` | `My Realm` | Realm display name |
| `REALM_DESCRIPTION` | `A Concord server` | Realm description |
| `REALM_ENCRYPTED` | `false` | Whether realm uses encryption |
| `RETENTION_DAYS` | `null` (forever) | Auto-delete messages older than N days |
| `DATA_DIR` | `./data` | SQLite database + file storage directory |
| `MAX_FILE_SIZE` | `52428800` (50MB) | Maximum upload file size in bytes |

---

## Infrastructure

- SQLite database, zero external dependencies
- Runs on a Raspberry Pi, a VPS, or a rack in your basement. Text channels run great on minimal hardware. Voice and video chat performance scales with your server's CPU and bandwidth.
- Configure retention, file limits, encryption — all via environment variables

---

## Security

*Disappoint surveillance with math, not promises.*

### End-to-end encryption that actually works

Every message and file is encrypted client-side with AES-256-GCM before it touches a server. Keys are derived with Argon2id. The server stores ciphertext — it literally cannot read your conversations or access your files.

### Zero-knowledge architecture by design

There is no master user table. No social graph on a server. Your public key is your username. If a server is compromised, attackers get encrypted blobs they can't decrypt.

### Your identity is a seed phrase, not a database row

24 words generate your cryptographic keypair via BIP39. No email, no password, no account. Take your identity anywhere. It survives lost devices, deleted apps, and shuttered companies.

---

## FAQ

**What makes Concord different from Discord or Slack?**

Every message and file is encrypted before it leaves your device. The server stores only ciphertext it can't decrypt. Your identity is a cryptographic keypair from a seed phrase — no email, no phone number, no central database. You own your data, your identity, and your infrastructure.

**How does the seed phrase identity work?**

When you first open Concord, you generate a 24-word BIP39 seed phrase. This phrase derives your Ed25519 keypair — your public key becomes your identity, and your secret key never leaves your device. Write down your words, and you can sign in from any device, forever.

**Can I really host my own server?**

Yes. One Docker command: `docker run -d -p 9000:9000 concord/server`. That's it. SQLite database, zero external dependencies. It runs text channels on a Raspberry Pi.

**What encryption does Concord use?**

AES-256-GCM for message and file encryption, Argon2id for password-based key derivation, and Ed25519 for digital signatures. Both messages and file attachments can be encrypted at the realm and channel level. All encryption happens client-side.

**Is Concord really open source?**

Yes. Every line of code is MIT licensed and available on GitHub. No hidden telemetry, no black boxes. Fork it, audit it, improve it.

**What about voice and video calls?**

Concord includes built-in voice channels, video calls, and screen sharing using a modern SFU architecture. All media runs through your realm server — no third-party services.

---

## Trust math, not promises.

Your seed phrase is your account. Your device is your encryption engine. Your server is just a relay for data it can't understand.

---

&copy; 2026 Concord. Open-source under MIT License.

