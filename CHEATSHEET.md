# Cheatsheet

Quick reference for topics covered in the React Demo bootcamp.

---

## Package Exports: `exports` vs `main`/`types`

When publishing a TypeScript package (like `shared-types`), consumers need to know where the entry point is. Without this, `import { ... } from "shared-types"` fails because Node.js and TypeScript can't resolve the file.

**Legacy approach — `main` + `types`:**
```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```
- `main` tells Node.js the runtime entry point
- `types` tells TypeScript where the declarations are
- Only supports a single entry point
- Can't distinguish between ESM (`import`) and CJS (`require`)

**Modern approach — `exports` map:**
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```
- Conditional resolution: serve different files for `import` vs `require`
- Subpath exports: expose `"shared-types/config"` as a separate entry point
- Encapsulation: blocks imports of internal files not listed in the map
- Co-locates type and runtime resolution per entry point

For ESM-only packages, `exports` makes the contract explicit. For simple single-entry packages, either approach works.

---

## Sync vs Async I/O: When to Use Which

### Backend config: use synchronous

```ts
// Sync — appropriate for one-time startup reads
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
```

Config is read once at startup before the server accepts requests. There's nothing running concurrently that would benefit from async. Sync keeps the code simpler — no `await`, no `Promise<T>`, no async propagation up the call chain.

**Rule of thumb:** Use sync I/O for one-time startup tasks (config, certs). Use async I/O for anything during request handling.

### Frontend config: always asynchronous

Frontends don't have filesystem access. Config comes from a network request (`fetch`), which is inherently async. A synchronous network call would freeze the entire UI.

```ts
// Frontend pattern
const res = await fetch("/api/config");
const config: FeConfig = await res.json();
```

### What about hot-reloading config at runtime?

Re-reading config while the server handles requests causes inconsistency — some requests use old config, others use new. The standard approach: edit the file and restart the server. Rolling restarts behind a load balancer handle zero-downtime if needed.

---

## File Path Resolution in ESM

Relative paths like `"Config/app-config.json"` resolve from `process.cwd()` (where the process was launched), not from where the source file lives. This breaks if someone runs the server from a different directory.

**Fix: derive `__dirname` from `import.meta.url`:**
```ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, "../../Config/backend/app-config.json");
```

This resolves relative to the source file's location, which is stable regardless of where the process was started. This is necessary because ESM doesn't provide `__dirname` and `__filename` like CommonJS does.

---

## Securing Backend-Driven Configuration

### The common concern

> "If I send `FeConfig` from the backend to the frontend, anyone can visit the endpoint and see the raw JSON."

### Why this is fine for public config

`FeConfig` contains app name, version, API URLs — all information that's already visible to anyone using the app (page title, network tab in DevTools, the JS bundle itself). Exposing it via an endpoint doesn't reveal anything new.

### HTTPS handles data in transit

HTTPS (TLS) encrypts the entire payload between server and browser. A man-in-the-middle can't read it. For public config, this is sufficient.

### Why application-level encryption doesn't help here

- **Symmetric encryption** (AES): The frontend needs the key to decrypt, so you'd ship the key to the browser. Anyone can find it in DevTools.
- **Asymmetric encryption** (RSA): The frontend needs the private key to decrypt — same problem. You can't hide secrets in a browser.

**Fundamental rule:** Anything the frontend can decrypt, the user can also decrypt. The browser is the user's machine.

### The actual solution: control what you send

Don't encrypt data that's heading to the frontend. Instead, decide what should leave the backend at all.

| Concern | Solution | Example |
|---|---|---|
| Data in transit | HTTPS | All API calls |
| Public config | No protection needed | `FeConfig` (app name, API URLs) |
| Private config | Don't send it to the frontend | `ApiConfig` (CORS, server internals) |
| User-specific data | Authentication (JWT, sessions) | `/api/user/profile` returns 401 if unauthenticated |
| Stored passwords | Hashing (bcrypt, argon2) | Database layer |

This is why `shared-types` defines `ApiConfig` and `FeConfig` separately — the split is an architectural decision about what's safe to be public, not an encryption decision.

---

## Symmetric vs Asymmetric Encryption

### What is symmetric encryption?

One key does both jobs — encrypt and decrypt. Think of it like a house key: the same key locks and unlocks the door.

**Common algorithms:** AES, ChaCha20

```
Sender (key: ABC123) → encrypts → ciphertext → decrypts → Receiver (key: ABC123)
```

- Fast — designed for bulk data
- Simple — one key to manage per relationship
- **The problem:** Both sides need the same key. How do you get the key to the other party securely in the first place? If you send it over the network unprotected, anyone intercepting it now has the key.

### What is asymmetric encryption?

Two keys that are mathematically linked: a **public key** (share with everyone) and a **private key** (keep secret). Data encrypted with the public key can only be decrypted with the private key, and vice versa.

**Common algorithms:** RSA, ECDSA, Ed25519

```
Sender (public key) → encrypts → ciphertext → decrypts → Receiver (private key)
```

- Solves the key distribution problem — the public key can be shared openly
- Slow — not practical for large amounts of data
- **The problem:** Computationally expensive. Encrypting a large payload with RSA is significantly slower than AES.

### How they work together: the TLS handshake

HTTPS doesn't pick one or the other — it uses both. This is how every browser-to-server connection works:

1. **Asymmetric phase (handshake):** The browser and server use asymmetric encryption to safely agree on a shared secret. The server's SSL certificate contains its public key. The browser uses it to exchange key material that no eavesdropper can read.
2. **Symmetric phase (data transfer):** Once both sides have the shared secret, they switch to symmetric encryption (AES) for the actual data. This is fast enough for streaming large responses.

```
Browser                              Server
   |                                    |
   |--- ClientHello ------------------->|
   |<-- ServerHello + Certificate ------|  (server sends public key)
   |                                    |
   |  [asymmetric key exchange]         |  (agree on shared secret)
   |                                    |
   |<== AES encrypted data ==========>|  (symmetric from here on)
```

Asymmetric solves the "how do we share a key safely" problem. Symmetric solves the "how do we encrypt data fast" problem. Together, they cover both.

### When to use which in backend-to-frontend

**You almost never implement these yourself.** HTTPS handles both for you at the transport layer. But understanding when each applies:

| Scenario | Type | Why | Who handles it |
|---|---|---|---|
| All HTTP traffic | Both (TLS) | Asymmetric for handshake, symmetric for data | HTTPS — automatic |
| JWT signing | Asymmetric | Backend signs with private key, frontend verifies with public key (not encryption — this is signing/verification) | Your auth library (jsonwebtoken, jose) |
| Encrypting database fields | Symmetric (AES) | Data at rest, server-side only, no key distribution problem since only the backend needs the key | Your backend code |
| End-to-end encryption (E2EE) | Both | Asymmetric to exchange keys between users, symmetric to encrypt messages | Specialized libraries (libsodium, tweetnacl) |
| Password storage | Neither | Use hashing (bcrypt, argon2), not encryption — passwords should be irreversible | Your backend code |

### Caveats

- **Don't roll your own crypto.** Use established libraries and protocols. A subtle implementation mistake can make encryption useless.
- **Encryption is not authentication.** Encrypting data proves no one can read it in transit. It doesn't prove who sent it. That's what signing (HMAC, RSA signatures, JWTs) is for.
- **Symmetric key storage matters.** If you use AES to encrypt database fields, the key must be stored securely (environment variable, secrets manager) — not in your codebase.
- **Asymmetric is not for bulk data.** RSA has a maximum payload size tied to key length (e.g., 245 bytes for a 2048-bit key). For large data, encrypt with AES and use asymmetric encryption only for the AES key — which is exactly what TLS does.