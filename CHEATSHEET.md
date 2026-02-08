# Cheatsheet

Quick reference for topics covered in the React Demo bootcamp.

## Table of Contents

- [Package Exports: `exports` vs `main`/`types`](#package-exports-exports-vs-maintypes)
- [Sync vs Async I/O: When to Use Which](#sync-vs-async-io-when-to-use-which)
  - [Backend config: use synchronous](#backend-config-use-synchronous)
  - [Frontend config: always asynchronous](#frontend-config-always-asynchronous)
  - [What about hot-reloading config at runtime?](#what-about-hot-reloading-config-at-runtime)
- [File Path Resolution in ESM](#file-path-resolution-in-esm)
- [Securing Backend-Driven Configuration](#securing-backend-driven-configuration)
  - [The common concern](#the-common-concern)
  - [Why this is fine for public config](#why-this-is-fine-for-public-config)
  - [HTTPS handles data in transit](#https-handles-data-in-transit)
  - [Why application-level encryption doesn't help here](#why-application-level-encryption-doesnt-help-here)
  - [The actual solution: control what you send](#the-actual-solution-control-what-you-send)
- [Symmetric vs Asymmetric Encryption](#symmetric-vs-asymmetric-encryption)
  - [What is symmetric encryption?](#what-is-symmetric-encryption)
  - [What is asymmetric encryption?](#what-is-asymmetric-encryption)
  - [How they work together: the TLS handshake](#how-they-work-together-the-tls-handshake)
  - [When to use which in backend-to-frontend](#when-to-use-which-in-backend-to-frontend)
  - [Caveats](#caveats)
- [What is JWT?](#what-is-jwt)
  - [Structure: Three Parts Separated by Dots](#structure-three-parts-separated-by-dots)
  - [How the Signature Works](#how-the-signature-works)
  - [Important: JWTs Are Signed, Not Encrypted](#important-jwts-are-signed-not-encrypted)
  - [Common Claims](#common-claims)
- [JWT Token-Based Authentication](#jwt-token-based-authentication)
  - [Why Use Tokens Instead of Sessions?](#why-use-tokens-instead-of-sessions)
  - [The Two-Token Pattern](#the-two-token-pattern)
  - [Storage Security](#storage-security)
- [Authentication Flow](#authentication-flow)
  - [Login Flow](#login-flow)
  - [API Request Flow](#api-request-flow)
  - [Token Refresh Flow](#token-refresh-flow)
  - [Logout Flow](#logout-flow)
  - [Complete Flow Diagram](#complete-flow-diagram)
  - [Key Security Points](#key-security-points)
- [JSON Config Files vs .ENV Files](#json-config-files-vs-env-files)
  - [What Are JSON Config Files?](#what-are-json-config-files)
  - [What Are .ENV Files?](#what-are-env-files)
  - [Comparison Table](#comparison-table)
  - [Advantages of JSON Config](#advantages-of-json-config)
  - [Disadvantages of JSON Config](#disadvantages-of-json-config)
  - [Advantages of .ENV Files](#advantages-of-env-files)
  - [Disadvantages of .ENV Files](#disadvantages-of-env-files)
  - [Security Considerations](#security-considerations)
  - [Best Practice: Hybrid Approach](#best-practice-hybrid-approach)
  - [Backend-Driven Configuration with .ENV](#backend-driven-configuration-with-env)
  - [Code Examples: Hybrid Pattern](#code-examples-hybrid-pattern)
  - [Quick Reference: Decision Matrix](#quick-reference-decision-matrix)
  - [Common Pitfalls](#common-pitfalls)
- [Cookies and Sessions Explained](#cookies-and-sessions-explained)
  - [What Are Cookies?](#what-are-cookies)
  - [Cookies vs Sessions](#cookies-vs-sessions)
  - [Cookies vs Sessions vs Tokens](#cookies-vs-sessions-vs-tokens)
  - [How This Codebase Uses Cookies](#how-this-codebase-uses-cookies)
  - [Cookie Options Explained](#cookie-options-explained)
  - [httpOnly: The XSS Defense](#httponly-the-xss-defense)
  - [SameSite: The CSRF Defense](#samesite-the-csrf-defense)
  - [Secure: The Man-in-the-Middle Defense](#secure-the-man-in-the-middle-defense)
  - [Server-Side Token Storage](#server-side-token-storage)
  - [Advantages of httpOnly Cookies for Refresh Tokens](#advantages-of-httponly-cookies-for-refresh-tokens)
  - [Disadvantages and Caveats](#disadvantages-and-caveats)
  - [Best Practices for Cookie-Based Authentication](#best-practices-for-cookie-based-authentication)
  - [Quick Reference: Cookie Security Checklist](#quick-reference-cookie-security-checklist)
  - [Common Pitfalls](#common-pitfalls-1)
  - [Visual: Cookie Lifecycle](#visual-cookie-lifecycle)

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

---

## What is JWT?

**JWT (JSON Web Token)** is a compact, URL-safe token format for securely transmitting claims between parties. It's a string that looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEiLCJlbWFpbCI6ImRlbW9AZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.abc123signature
```

### Structure: Three Parts Separated by Dots

```
HEADER.PAYLOAD.SIGNATURE
```

| Part | Purpose | Example (decoded) |
|------|---------|-------------------|
| **Header** | Algorithm & token type | `{"alg": "HS256", "typ": "JWT"}` |
| **Payload** | Claims (user data) | `{"userId": "user-1", "email": "demo@example.com", "exp": 1699999999}` |
| **Signature** | Verification hash | Created by signing header + payload with a secret |

### How the Signature Works

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

The signature ensures:
- **Integrity** — if anyone modifies the payload, the signature won't match
- **Authenticity** — only someone with the secret could have created it

### Important: JWTs Are Signed, Not Encrypted

Anyone can decode a JWT and read the payload (it's just Base64). The signature only proves it wasn't tampered with. **Never put secrets in a JWT payload.**

```ts
// Anyone can decode this
const payload = JSON.parse(atob(token.split('.')[1]));
// { userId: "user-1", email: "demo@example.com", ... }
```

### Common Claims

| Claim | Name | Purpose |
|-------|------|---------|
| `exp` | Expiration | Unix timestamp when token expires |
| `iat` | Issued At | Unix timestamp when token was created |
| `sub` | Subject | Who the token is about (usually user ID) |
| `iss` | Issuer | Who issued the token |
| Custom | — | Your app-specific data (`userId`, `role`, etc.) |

---

## JWT Token-Based Authentication

### Why Use Tokens Instead of Sessions?

| Aspect | Session-Based | Token-Based (JWT) |
|--------|---------------|-------------------|
| **State** | Server stores session data | Stateless — token contains all info |
| **Scaling** | Needs shared session store (Redis) | No server state to sync |
| **Mobile/API** | Cookies can be problematic | Works anywhere (headers) |
| **Revocation** | Easy — delete session | Hard — token valid until expiry |

### The Two-Token Pattern

Modern auth uses two tokens with different lifetimes:

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| **Access Token** | Short (15 min) | Memory (JS variable) | Authorize API requests |
| **Refresh Token** | Long (7 days) | httpOnly cookie | Get new access tokens |

**Why two tokens?**
- Access tokens are sent with every request → higher exposure risk → short lifetime limits damage
- Refresh tokens are only sent to `/auth/refresh` → lower exposure → can live longer
- If access token leaks, attacker has 15 minutes. If refresh token leaks (harder), you can revoke it server-side.

### Storage Security

| Storage | XSS Safe | CSRF Safe | Recommendation |
|---------|----------|-----------|----------------|
| `localStorage` | No | Yes | Never for tokens |
| `sessionStorage` | No | Yes | Never for tokens |
| JS Memory | Yes | Yes | Access token |
| `httpOnly` cookie | Yes | No* | Refresh token |

*httpOnly cookies need CSRF protection, but `SameSite=Strict` handles most cases.

---

## Authentication Flow

### Login Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              LOGIN FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

  Browser                                              Backend
     │                                                    │
     │  POST /v1/auth/login                               │
     │  { email, password }                               │
     │ ─────────────────────────────────────────────────► │
     │                                                    │
     │                                    Validate credentials
     │                                    Generate access token (15 min)
     │                                    Generate refresh token (7 days)
     │                                    Store refresh token in DB/memory
     │                                                    │
     │  { accessToken, user }                             │
     │  + Set-Cookie: refreshToken (httpOnly)             │
     │ ◄───────────────────────────────────────────────── │
     │                                                    │
     │  Store accessToken in memory                       │
     │  (JS variable, React state/context)                │
     ▼                                                    ▼
```

### API Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API REQUEST FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

  Browser                                              Backend
     │                                                    │
     │  GET /v1/protected/resource                        │
     │  Authorization: Bearer <accessToken>               │
     │ ─────────────────────────────────────────────────► │
     │                                                    │
     │                                    Verify JWT signature
     │                                    Check expiration
     │                                    Extract user from payload
     │                                                    │
     │  200 OK { data }                                   │
     │ ◄───────────────────────────────────────────────── │
     ▼                                                    ▼
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TOKEN REFRESH FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

  Browser                                              Backend
     │                                                    │
     │  Access token expired or 401 received              │
     │                                                    │
     │  POST /v1/auth/refresh                             │
     │  Cookie: refreshToken (sent automatically)         │
     │ ─────────────────────────────────────────────────► │
     │                                                    │
     │                                    Verify refresh token JWT
     │                                    Check if token in store (not revoked)
     │                                    Generate NEW access token
     │                                    Generate NEW refresh token (rotation)
     │                                    Revoke old refresh token
     │                                    Store new refresh token
     │                                                    │
     │  { accessToken }                                   │
     │  + Set-Cookie: refreshToken (new)                  │
     │ ◄───────────────────────────────────────────────── │
     │                                                    │
     │  Store new accessToken in memory                   │
     │  Retry original failed request                     │
     ▼                                                    ▼
```

### Logout Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             LOGOUT FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

  Browser                                              Backend
     │                                                    │
     │  POST /v1/auth/logout                              │
     │  Cookie: refreshToken                              │
     │ ─────────────────────────────────────────────────► │
     │                                                    │
     │                                    Revoke refresh token from store
     │                                    Clear cookie
     │                                                    │
     │  200 OK                                            │
     │  + Set-Cookie: refreshToken="" (cleared)           │
     │ ◄───────────────────────────────────────────────── │
     │                                                    │
     │  Clear accessToken from memory                     │
     │  Redirect to login                                 │
     ▼                                                    ▼
```

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE AUTHENTICATION LIFECYCLE                     │
└─────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────┐
                                 │  START  │
                                 └────┬────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │  Has refresh      │
                            │  token cookie?    │
                            └────────┬──────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │ No                              │ Yes
                    ▼                                 ▼
            ┌───────────────┐               ┌───────────────────┐
            │  Show Login   │               │  Call /refresh    │
            │  Page         │               └─────────┬─────────┘
            └───────┬───────┘                         │
                    │                    ┌────────────┴────────────┐
                    │                    │ Success                 │ Fail
                    ▼                    ▼                         ▼
            ┌───────────────┐   ┌───────────────────┐      ┌─────────────┐
            │  User enters  │   │  Store access     │      │ Clear cookie│
            │  credentials  │   │  token in memory  │      │ Show login  │
            └───────┬───────┘   └─────────┬─────────┘      └─────────────┘
                    │                     │
                    ▼                     ▼
            ┌───────────────┐   ┌───────────────────┐
            │  POST /login  │   │  USER IS          │◄─────────────┐
            └───────┬───────┘   │  AUTHENTICATED    │              │
                    │           └─────────┬─────────┘              │
                    │                     │                        │
                    │                     ▼                        │
                    │           ┌───────────────────┐              │
                    │           │  Make API calls   │              │
                    │           │  with access token│              │
                    │           └─────────┬─────────┘              │
                    │                     │                        │
                    │        ┌────────────┴────────────┐           │
                    │        │ 401?                    │ Success   │
                    │        ▼                         ▼           │
                    │  ┌───────────┐            ┌───────────┐      │
                    │  │ /refresh  │────────────│  Continue │      │
                    │  └───────────┘  Success   └───────────┘      │
                    │        │                                     │
                    │        │ Fail                                │
                    │        ▼                                     │
                    │  ┌───────────┐                               │
                    └─►│  Logout   │───────────────────────────────┘
                       │  /login   │        (with new tokens)
                       └───────────┘
```

### Key Security Points

| Point | Implementation |
|-------|----------------|
| Access token in memory | Not accessible via XSS on other tabs; cleared on page close |
| Refresh token httpOnly | JavaScript cannot read it; only sent to `/auth/refresh` |
| Token rotation | Each refresh issues new refresh token, revokes old one |
| Short access token life | 15 minutes limits damage if token leaks |
| Server-side revocation | Refresh tokens stored in DB/memory; can be invalidated |
| SameSite=Strict cookie | Prevents CSRF by not sending cookie cross-origin |

---

## JSON Config Files vs .ENV Files

> Configuration management is about storing application settings safely and accessibly. JSON files provide structure and type safety, while .ENV files handle secrets and environment-specific values.

### What Are JSON Config Files?

JSON (JavaScript Object Notation) configuration files store application settings in a structured, hierarchical format. They're parsed as objects, making them ideal for complex configuration with nested data.

**Example structure:**
```json
{
  "server": {
    "host": "localhost",
    "port": 4000
  },
  "corsOptions": {
    "origin": "http://localhost:3000",
    "credentials": true
  },
  "authConfig": {
    "accessTokenExpiry": "15m",
    "refreshTokenExpiry": "7d"
  }
}
```

**Common use cases:**
- Application metadata (name, version, author)
- API endpoint URLs and paths
- Feature flags and toggles
- Structured settings (CORS, cookie options)
- Default values and constants

### What Are .ENV Files?

.ENV files store environment-specific configuration as key-value pairs. They're designed for secrets and values that change between environments (development, staging, production).

**Example structure:**
```bash
# .env file
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_ACCESS_SECRET=super-secret-key-change-in-production
JWT_REFRESH_SECRET=another-secret-key-keep-this-safe
API_KEY=sk_live_abc123xyz789
ENCRYPTION_KEY=aes256-key-for-encryption
```

**Common use cases:**
- Database connection strings
- API keys and secrets
- JWT signing keys
- Third-party service credentials
- Environment indicators (NODE_ENV)
- Passwords and tokens

### Comparison Table

| Aspect | JSON Config Files | .ENV Files |
|--------|------------------|------------|
| **Structure** | Nested objects and arrays | Flat key-value pairs |
| **Data Types** | Boolean, number, string, object, array, null | Strings only (parsed by app) |
| **Comments** | Not supported (use JSON5 for comments) | Supported with `#` |
| **TypeScript Typing** | Full type safety with interfaces | Requires manual type assertions |
| **Validation** | Easy with schemas (Zod, Joi) | Requires custom validation logic |
| **Version Control** | Safe to commit (for public config) | Never commit (use .gitignore) |
| **Secrets Storage** | Unsafe — visible in repository | Designed for secrets |
| **Nesting** | Supports deep nesting | Flat structure (use prefixes) |
| **Parsing** | `JSON.parse()` built-in | Requires `dotenv` package |
| **Readability** | Structured, easy to scan | Simple, line-by-line |
| **Environment Switching** | Requires multiple files | Single file per environment |
| **12-Factor App** | Not aligned | Core principle |
| **CI/CD Integration** | Manual replacement needed | Native support (env vars) |

### Advantages of JSON Config

**1. Structured Data**
```json
// Easy to organize related settings
{
  "database": {
    "pool": {
      "min": 2,
      "max": 10
    },
    "timeout": 30000
  }
}
```

**2. TypeScript Type Safety**
```ts
// Define strict types
interface ApiConfig {
  server: {
    host: string;
    port: number;
  };
  authConfig: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
}

// Type-safe access
const config: ApiConfig = JSON.parse(fs.readFileSync("config.json", "utf8"));
config.server.port; // TypeScript knows this is a number
```

**3. Validation with Schemas**
```ts
import { z } from "zod";

const ConfigSchema = z.object({
  server: z.object({
    host: z.string(),
    port: z.number().min(1).max(65535),
  }),
  authConfig: z.object({
    accessTokenExpiry: z.string().regex(/^\d+[mhd]$/),
  }),
});

// Validates and throws if invalid
const config = ConfigSchema.parse(rawConfig);
```

**4. Complex Data Types**
```json
{
  "features": ["auth", "analytics", "payments"],
  "rateLimits": {
    "guest": 100,
    "user": 1000,
    "premium": 10000
  },
  "enabled": true
}
```

### Disadvantages of JSON Config

**1. Secrets Exposure**
```json
// DANGEROUS — Never commit this
{
  "database": {
    "password": "supersecretpassword123"  // ❌ Exposed in git history
  }
}
```

If accidentally committed, the secret remains in git history forever. Rotating keys doesn't remove the exposure.

**2. Environment Switching**
```bash
# Requires multiple files and manual switching
config.development.json
config.staging.json
config.production.json

# Or error-prone conditional logic
const config = process.env.NODE_ENV === "production"
  ? prodConfig
  : devConfig;
```

**3. No Native Environment Variable Support**

Most deployment platforms (Heroku, Vercel, AWS) use environment variables. JSON config requires manual conversion or replacement during deployment.

**4. No Comments**

Standard JSON doesn't support comments. You'd need JSON5 or JSONC, which adds complexity.

### Advantages of .ENV Files

**1. Secrets Handling**
```bash
# .env — Never committed
DATABASE_PASSWORD=super-secret-password
JWT_SECRET=another-secret-key
API_KEY=sk_live_abc123xyz789
```

**.gitignore prevents accidental commits:**
```gitignore
.env
.env.local
.env.*.local
```

**2. 12-Factor App Principle**

The [12-Factor App methodology](https://12factor.net/config) recommends storing config in environment variables. This separates code from configuration and makes apps portable.

**3. CI/CD Integration**
```yaml
# GitHub Actions — inject secrets at runtime
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

No need to manage config files — secrets are injected during deployment.

**4. Environment-Specific Files**
```bash
.env                  # Default values
.env.local            # Local overrides (gitignored)
.env.development      # Development-specific
.env.production       # Production-specific
```

Tooling like `dotenv` automatically loads the right file based on `NODE_ENV`.

**5. Simple Override Hierarchy**
```bash
# .env (default)
PORT=3000

# .env.local (overrides default)
PORT=4000

# Command line (overrides all)
PORT=5000 npm start
```

### Disadvantages of .ENV Files

**1. Flat Structure**
```bash
# No nesting — use prefixes for organization
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mydb
DATABASE_USER=admin
DATABASE_PASSWORD=secret

# vs JSON's natural hierarchy
# { database: { host: "localhost", port: 5432 } }
```

**2. No Type Safety**
```bash
# .env
PORT=4000
ENABLE_FEATURE=true

# In code — everything is a string
process.env.PORT // "4000" (string, not number)
process.env.ENABLE_FEATURE // "true" (string, not boolean)

// Requires manual parsing
const port = parseInt(process.env.PORT || "3000", 10);
const enabled = process.env.ENABLE_FEATURE === "true";
```

**3. No Validation**

There's no built-in schema. You must manually check if required variables exist and have valid values.

```ts
// Manual validation required
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}
```

**4. Limited Data Types**
```bash
# Can't represent arrays or complex objects easily
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# In code
const origins = process.env.ALLOWED_ORIGINS?.split(",") || [];
```

### Security Considerations

**What Goes Where?**

| Data | Storage | Reason |
|------|---------|--------|
| Database passwords | .ENV | Secret — must not be in repo |
| API keys (third-party) | .ENV | Secret — must not be in repo |
| JWT signing secrets | .ENV | Secret — must not be in repo |
| Encryption keys | .ENV | Secret — must not be in repo |
| Database host | Either | Not secret, but environment-specific |
| Port number | Either | Not secret, but environment-specific |
| App name/version | JSON | Public metadata, rarely changes |
| CORS origins | JSON | Public, often hardcoded per environment |
| Feature flags | JSON | Public configuration |
| API endpoint URLs | JSON | Public, structure benefits |

**Critical Rule:**
```
If it must remain secret → .ENV (and add to .gitignore)
If it's public or structured → JSON (safe to commit)
```

**.gitignore Best Practices:**
```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Do NOT ignore these (they're templates)
!.env.example
!.env.template

# Config files with secrets
config.local.json
secrets.json
```

### Best Practice: Hybrid Approach

**Use both — JSON for structure, .ENV for secrets.**

**Backend implementation (this codebase pattern):**

1. **JSON file stores public config:**
```json
// Config/backend/api-config.json (committed to git)
{
  "appInfo": {
    "name": "backend-react-demo",
    "version": "1.0.0"
  },
  "server": {
    "host": "localhost",
    "port": 4000
  },
  "authConfig": {
    "accessTokenExpiry": "15m",
    "refreshTokenExpiry": "7d",
    "refreshTokenCookieName": "refreshToken"
  }
}
```

2. **.ENV file stores secrets (NOT in repo):**
```bash
# .env (NOT committed — add to .gitignore)
NODE_ENV=development
JWT_ACCESS_SECRET=change-this-in-production
JWT_REFRESH_SECRET=another-secret-key
DATABASE_URL=postgresql://user:pass@localhost/db
```

3. **Merge at runtime:**
```ts
// _Config/getApiConfig.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, "../../Config/backend/api-config.json");

export const getApiConfig = (): ApiConfig => {
  // Read JSON config
  const jsonConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Merge with environment variables (secrets)
  return {
    ...jsonConfig,
    authConfig: {
      ...jsonConfig.authConfig,
      accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
  };
};
```

**Why this works:**
- JSON provides structure and type safety
- .ENV keeps secrets out of version control
- Merge function combines both at startup
- Type definitions enforce the contract
- Validation can check for missing secrets

### Backend-Driven Configuration with .ENV

**Problem:** Frontend apps can't use .ENV files directly. Browsers don't have filesystem access or environment variables.

**Solution:** Backend reads .ENV, filters safe values, and serves them via API.

**Architecture:**
```
┌──────────────────────────────────────────────────────────────┐
│                    CONFIGURATION FLOW                         │
└──────────────────────────────────────────────────────────────┘

  .env file (backend only)           JSON config (backend)
  ───────────────────────             ─────────────────────
  NODE_ENV=production                 {
  JWT_ACCESS_SECRET=secret              "appInfo": {
  JWT_REFRESH_SECRET=secret2              "name": "MyApp",
  DATABASE_URL=postgres://...             "version": "1.0.0"
  ↓                                       },
  ↓                                       "corsOptions": {...}
  ↓                                     }
  ↓                                     ↓
  └─────────────┬───────────────────────┘
                ↓
        ┌───────────────────┐
        │  getApiConfig()   │ ← Merges JSON + .ENV
        └─────────┬─────────┘
                  ↓
          ┌───────────────┐
          │  ApiConfig    │ ← Full backend config
          │  (includes    │    (with secrets)
          │   secrets)    │
          └───────┬───────┘
                  ↓
          ┌───────────────┐
          │  Filter       │ ← Remove secrets
          │  Secrets      │
          └───────┬───────┘
                  ↓
          ┌───────────────┐
          │  FeConfig     │ ← Safe for frontend
          │  (public      │    (no secrets)
          │   only)       │
          └───────┬───────┘
                  ↓
          ┌───────────────┐
          │ GET /api/     │
          │    config     │
          └───────┬───────┘
                  ↓
          ┌───────────────┐
          │   Frontend    │
          │   receives    │
          │   FeConfig    │
          └───────────────┘
```

**Implementation:**

**1. Define separate types:**
```ts
// shared-types/src/Config/index.ts

// Backend config (includes secrets)
export interface ApiConfig {
  appInfo: {
    name: string;
    version: string;
  };
  server: {
    host: string;
    port: number;
  };
  authConfig: {
    accessTokenSecret: string;      // ← SECRET
    refreshTokenSecret: string;     // ← SECRET
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  database: {
    url: string;                    // ← SECRET
  };
}

// Frontend config (public only)
export interface FeConfig {
  appInfo: {
    name: string;
    version: string;
  };
  apiUrl: string;
  authConfig: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    // Note: NO secrets here
  };
}
```

**2. Backend endpoint filters secrets:**
```ts
// backend/_Controllers/ConfigController.ts
import type { Request, Response } from "express";
import { getApiConfig } from "../_Config/getApiConfig.js";
import type { FeConfig } from "shared-types";

export const ConfigController = () => {
  const getConfig = (req: Request, res: Response): void => {
    const apiConfig = getApiConfig(); // Full config with secrets

    // Filter to safe public values only
    const feConfig: FeConfig = {
      appInfo: {
        name: apiConfig.appInfo.name,
        version: apiConfig.appInfo.version,
      },
      apiUrl: `http://${apiConfig.server.host}:${apiConfig.server.port}`,
      authConfig: {
        accessTokenExpiry: apiConfig.authConfig.accessTokenExpiry,
        refreshTokenExpiry: apiConfig.authConfig.refreshTokenExpiry,
        // Secrets NOT included
      },
    };

    res.json(feConfig);
  };

  return { getConfig };
};
```

**3. Frontend fetches config:**
```ts
// vite-react-demo/src/config.ts
import type { FeConfig } from "shared-types";

let cachedConfig: FeConfig | null = null;

export const getFeConfig = async (): Promise<FeConfig> => {
  if (cachedConfig) return cachedConfig;

  const response = await fetch("http://localhost:4000/api/config");

  if (!response.ok) {
    throw new Error("Failed to fetch config");
  }

  cachedConfig = await response.json();
  return cachedConfig;
};

// Usage in React component
const App = () => {
  const [config, setConfig] = useState<FeConfig | null>(null);

  useEffect(() => {
    getFeConfig().then(setConfig);
  }, []);

  if (!config) return <div>Loading...</div>;

  return <div>{config.appInfo.name} v{config.appInfo.version}</div>;
};
```

**Security guarantees:**
- JWT secrets never leave the backend
- Database credentials stay server-side
- Frontend only receives what it needs
- Type system enforces the separation

**Why this is better than .env in frontend build tools:**

Many frontend frameworks (Vite, Next.js, Create React App) support `.env` files with prefixes:
```bash
# Vite requires VITE_ prefix
VITE_API_URL=http://localhost:4000

# Next.js requires NEXT_PUBLIC_ prefix
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Problems with this approach:**
1. **Everything is baked into the bundle** — changing config requires rebuilding
2. **No dynamic runtime config** — can't adjust based on deployment environment
3. **Easy to leak secrets** — forget the prefix, and it's in the bundle
4. **No backend control** — frontend can't get updated config without redeploying

**Backend-driven config solves this:**
- No rebuild needed to update config
- Backend controls exactly what's public
- Can dynamically serve different config per environment
- Impossible to accidentally expose secrets

### Code Examples: Hybrid Pattern

**Complete example:**

**File structure:**
```
backend-react-demo/
├── Config/
│   └── backend/
│       └── api-config.json         # Public config (committed)
├── src/
│   └── _Config/
│       └── getApiConfig.ts         # Merges JSON + .ENV
├── .env                            # Secrets (NOT committed)
├── .env.example                    # Template (committed)
└── .gitignore                      # Excludes .env
```

**.env.example (committed as template):**
```bash
# Copy to .env and fill in real values
NODE_ENV=development
JWT_ACCESS_SECRET=change-this-secret
JWT_REFRESH_SECRET=another-secret
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

**.env (NOT committed — developers create locally):**
```bash
NODE_ENV=development
JWT_ACCESS_SECRET=local-dev-secret-key
JWT_REFRESH_SECRET=local-refresh-secret
DATABASE_URL=postgresql://dev:devpass@localhost:5432/myapp_dev
```

**api-config.json (committed):**
```json
{
  "appInfo": {
    "name": "backend-react-demo",
    "author": "Christian Paul Mendoza",
    "version": "1.0.0"
  },
  "server": {
    "host": "localhost",
    "port": 4000
  },
  "corsOptions": {
    "origin": "http://localhost:3000",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "allowedHeaders": "Content-Type,Authorization",
    "credentials": true
  },
  "authConfig": {
    "accessTokenExpiry": "15m",
    "refreshTokenExpiry": "7d",
    "refreshTokenCookieName": "refreshToken"
  }
}
```

**getApiConfig.ts (merge logic):**
```ts
import type { ApiConfig } from "../_Models/Types/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../Config/backend/api-config.json");

const API_CONFIG_MAP = new Map();
const API_CONFIG_NAME = "__API_CONFIG";

export const getApiConfig = (): ApiConfig => {
  // Check cache first
  let _apiConfig: ApiConfig = API_CONFIG_MAP.get(API_CONFIG_NAME);

  if (_apiConfig) {
    console.log("Using cached configuration.");
    return _apiConfig;
  }

  try {
    // Read JSON config
    const jsonConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    if (!Object.keys(jsonConfig).length) {
      throw new Error("API Configuration file is empty.");
    }

    // Merge with environment variables
    _apiConfig = {
      ...jsonConfig,
      authConfig: {
        ...jsonConfig.authConfig,
        // Inject secrets from .env
        accessTokenSecret: process.env.JWT_ACCESS_SECRET || "fallback-dev-secret",
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET || "fallback-dev-secret",
        cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    };

    // Validate required secrets in production
    if (process.env.NODE_ENV === "production") {
      if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error("JWT secrets must be set in production");
      }
    }

    // Cache the merged config
    API_CONFIG_MAP.set(API_CONFIG_NAME, _apiConfig);
    console.log("Configuration loaded successfully");
  } catch (error) {
    console.error("Failed to load API configuration:", error);
    throw new Error("Could not read API Configuration.");
  }

  return _apiConfig;
};
```

**.gitignore:**
```gitignore
# Environment variables (secrets)
.env
.env.local
.env.*.local

# Keep example files
!.env.example

# Local config overrides
config.local.json
```

**Benefits of this pattern:**
- JSON provides structure for public config
- .ENV keeps secrets out of git
- Type safety via TypeScript interfaces
- Single source of truth (merged at runtime)
- Easy to onboard (copy .env.example to .env)
- Production-ready (validates secrets in prod mode)

### Quick Reference: Decision Matrix

| Question | Answer | Use |
|----------|--------|-----|
| Is it a secret? | Yes | .ENV |
| Is it a secret? | No | Either |
| Does it change per environment? | Yes | .ENV |
| Does it have nested structure? | Yes | JSON |
| Do you need TypeScript types? | Yes | JSON |
| Does it need validation logic? | Yes | JSON |
| Is it a single value? | Yes | .ENV |
| Will it be in git? | Yes | JSON |
| Will it be in git? | No | .ENV |
| Is it a third-party API key? | Yes | .ENV |
| Is it a feature flag? | Yes | JSON |
| Is it metadata (name, version)? | Yes | JSON |

### Common Pitfalls

- **Committing .env files** — Always add to .gitignore. Once committed, secrets are in git history forever.
- **Hardcoding secrets in JSON** — Use .ENV for secrets, even if JSON is easier.
- **No .env.example** — Other developers won't know what variables are required.
- **Using JSON for environment-specific values** — Creates multiple files that drift (dev.json, prod.json).
- **Exposing secrets to frontend** — Filter carefully in backend endpoint. TypeScript types help enforce this.
- **Not validating .ENV values** — Check for required variables at startup, not when they're first used.
- **Mixing concerns** — Keep JSON for structure, .ENV for secrets. Don't blur the line.

---

## Cookies and Sessions Explained

> HTTP cookies are small pieces of data that servers send to browsers, which browsers store and send back with subsequent requests to the same domain.

### What Are Cookies?

Cookies solve a fundamental problem: **HTTP is stateless**. Each request is independent — the server has no memory of previous requests. Cookies provide a way to maintain state across requests.

When a server wants to "remember" something about a client, it sends a `Set-Cookie` header:

```
HTTP Response:
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict
```

The browser stores this cookie and automatically sends it back with every request to that domain:

```
HTTP Request:
Cookie: sessionId=abc123
```

The server reads the cookie and knows which user is making the request.

### Cookies vs Sessions

| Aspect | Cookies | Sessions |
|--------|---------|----------|
| **What it is** | Data stored on the client (browser) | Data stored on the server (database/memory) |
| **Storage location** | Browser's cookie jar | Server's memory/Redis/database |
| **Size limit** | 4KB per cookie | No practical limit |
| **Persistence** | Can persist after browser close | Usually expires when browser closes or after timeout |
| **Security exposure** | Sent with every request; visible in browser | Only session ID sent; data stays server-side |
| **Common use case** | Store session ID, preferences, tracking | Store user state, shopping cart, temporary data |

**Key insight:** Cookies and sessions work together. The cookie stores the session ID, and the server looks up the full session data using that ID.

```
Browser Cookie: sessionId=abc123
       ↓
Server Session Store: abc123 → { userId: "user-1", cart: [...], loginTime: ... }
```

### Cookies vs Sessions vs Tokens

| Feature | Session-Based Auth | Token-Based Auth (JWT) |
|---------|-------------------|------------------------|
| **State storage** | Server stores session data | Token contains all data (stateless) |
| **Cookie usage** | Cookie holds session ID | Cookie can hold refresh token |
| **Scalability** | Requires shared session store (Redis) | No server state to sync |
| **Revocation** | Easy — delete session from store | Hard — token valid until expiry* |
| **Data size** | Unlimited server-side | Limited (tokens should be small) |
| **Security model** | Obscure session ID | Signed JWT payload |

*With the two-token pattern, refresh tokens ARE stored server-side, enabling revocation.

### How This Codebase Uses Cookies

The authentication system uses **httpOnly cookies** for refresh tokens. Here's the complete flow:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                   COOKIE-BASED REFRESH TOKEN FLOW                          │
└───────────────────────────────────────────────────────────────────────────┘

  Browser                                           Backend
     │                                                 │
     │  POST /v1/auth/login                            │
     │  { email, password }                            │
     │ ──────────────────────────────────────────────► │
     │                                                 │
     │                                 [AuthController.login]
     │                                 - Validate credentials
     │                                 - Generate access token (JWT, 15 min)
     │                                 - Generate refresh token (JWT, 7 days)
     │                                 - Store refresh token in RefreshTokenStore
     │                                                 │
     │  Response:                                      │
     │  { accessToken, user }                          │
     │  Set-Cookie: refreshToken=xyz789;               │
     │              HttpOnly; Secure; SameSite=Strict  │
     │ ◄────────────────────────────────────────────── │
     │                                                 │
     │  [Browser stores cookie automatically]          │
     │  Cookie: refreshToken=xyz789                    │
     │                                                 │
     │  ─────── Time passes, access token expires ──── │
     │                                                 │
     │  POST /v1/auth/refresh                          │
     │  [Browser sends cookie automatically]           │
     │  Cookie: refreshToken=xyz789                    │
     │ ──────────────────────────────────────────────► │
     │                                                 │
     │                                 [AuthController.refresh]
     │                                 - Read cookie: req.cookies.refreshToken
     │                                 - Verify JWT signature
     │                                 - Check token in RefreshTokenStore
     │                                 - Generate NEW access token
     │                                 - Generate NEW refresh token (rotation)
     │                                 - Revoke old token, store new one
     │                                                 │
     │  Response:                                      │
     │  { accessToken }                                │
     │  Set-Cookie: refreshToken=new456; ...           │
     │ ◄────────────────────────────────────────────── │
     │                                                 │
     │  POST /v1/auth/logout                           │
     │  Cookie: refreshToken=new456                    │
     │ ──────────────────────────────────────────────► │
     │                                                 │
     │                                 [AuthController.logout]
     │                                 - Read cookie
     │                                 - Revoke token from RefreshTokenStore
     │                                 - Clear cookie
     │                                                 │
     │  Set-Cookie: refreshToken=; Max-Age=0           │
     │ ◄────────────────────────────────────────────── │
     │                                                 │
     │  [Browser deletes cookie]                       │
     └                                                 ┘
```

### Cookie Options Explained

In `AuthController.ts`, the cookie is configured with these options:

```ts
const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: config.authConfig.cookieMaxAge,
    path: "/",
});
```

| Option | Value | Purpose | Security Impact |
|--------|-------|---------|----------------|
| **httpOnly** | `true` | JavaScript cannot access this cookie | Prevents XSS attacks from stealing tokens |
| **secure** | `true` (prod) | Cookie only sent over HTTPS | Prevents man-in-the-middle from intercepting |
| **sameSite** | `"strict"` | Cookie not sent on cross-site requests | Prevents CSRF attacks |
| **maxAge** | `604800000` (7 days) | Cookie expires after this time | Limits exposure window |
| **path** | `"/"` | Cookie sent to all routes | Allows `/auth/refresh`, `/auth/logout`, etc. |

### httpOnly: The XSS Defense

**The problem httpOnly solves:**

Without httpOnly, JavaScript can read cookies:
```js
// Without httpOnly
const token = document.cookie; // "refreshToken=xyz789"
// XSS attacker can steal this and send it to their server
```

With httpOnly, the browser prevents JavaScript access:
```js
// With httpOnly
console.log(document.cookie); // "" (empty, refresh token not visible)
```

Even if an attacker injects malicious JavaScript via XSS, they cannot read the refresh token. The browser only sends it automatically with HTTP requests to the same domain.

**Trade-off:** You can't read the token in your own frontend code either. This is why:
- Access tokens go in memory (short-lived, needed for API calls)
- Refresh tokens go in httpOnly cookies (long-lived, only for `/auth/refresh`)

### SameSite: The CSRF Defense

**The problem SameSite solves:**

Cross-Site Request Forgery (CSRF) tricks the browser into making requests with the user's cookies:

```
User visits evil.com
evil.com has hidden form:
  <form action="https://yourbank.com/transfer" method="POST">
    <input name="to" value="attacker">
    <input name="amount" value="1000">
  </form>
  <script>document.forms[0].submit()</script>

Without SameSite, browser sends yourbank.com cookies automatically!
```

With `SameSite=Strict`, the cookie is ONLY sent when:
1. The request originates from the same site
2. The user navigates directly to the site

| SameSite Value | Cross-site GET | Cross-site POST | Use Case |
|----------------|----------------|-----------------|----------|
| `None` | Sent | Sent | Third-party embeds (not recommended) |
| `Lax` | Sent | Not sent | Balance between security and usability (default in modern browsers) |
| `Strict` | Not sent | Not sent | Maximum security (this codebase) |

**This codebase uses `Strict`** because:
- The frontend and backend are the same domain (or explicitly allowed via CORS)
- API calls from the same domain always work
- Cross-site attacks are completely blocked

### Secure: The Man-in-the-Middle Defense

**The problem Secure solves:**

Without the `Secure` flag, cookies are sent over both HTTP and HTTPS. An attacker on the same network (coffee shop WiFi) can intercept:

```
User on http://example.com (no encryption)
Attacker sniffs network traffic:
  Cookie: refreshToken=xyz789  ← Stolen!
```

With `Secure` flag:
- Cookie ONLY sent over HTTPS (encrypted connection)
- Browser refuses to send it over HTTP
- Network attacker sees encrypted gibberish

**Why this codebase conditionally sets it:**
```ts
secure: process.env.NODE_ENV === "production"
```

In development, you often use `http://localhost`. If `secure: true`, the browser won't send cookies. In production, you must use HTTPS, so `secure: true` is enabled.

### Server-Side Token Storage

The cookie holds the refresh token (JWT), but the server ALSO stores it in `RefreshTokenStore`. This dual approach enables:

**1. Instant Revocation**
```ts
// RefreshTokenStore.ts
const revoke = (userId: string, token: string): boolean => {
    const tokens = tokenStore.get(userId);
    const filtered = tokens.filter((t) => t.token !== token);
    tokenStore.set(userId, filtered);
};
```

Even though the JWT hasn't expired (7 days), the server refuses it if it's not in the store.

**2. Multi-Device Management**
```ts
// Supports multiple sessions per user (different devices)
const tokenStore = new Map<string, StoredToken[]>();

// Each device gets its own refresh token
interface StoredToken {
    userId: string;
    token: string;
    createdAt: Date;
    expiresAt: Date;
    userAgent?: string;  // "Mozilla/5.0 (iPhone...)"
    ipAddress?: string;  // "192.168.1.10"
}
```

Users can be logged in on phone, laptop, and tablet simultaneously. Logging out on one device doesn't affect others.

**3. Security Limits**
```ts
const MAX_SESSIONS_PER_USER = 5;

if (existingTokens.length >= MAX_SESSIONS_PER_USER) {
    existingTokens.shift(); // Remove oldest session
}
```

Prevents an attacker from creating unlimited sessions if they compromise credentials.

### Advantages of httpOnly Cookies for Refresh Tokens

| Advantage | Explanation |
|-----------|-------------|
| **XSS Protection** | JavaScript (including attacker's injected scripts) cannot read the token |
| **Automatic handling** | Browser sends cookie with every request — no manual `Authorization` header needed for refresh endpoint |
| **Separate security zones** | Access token (memory, short-lived) + Refresh token (httpOnly, long-lived) = defense in depth |
| **CSRF protection** | `SameSite=Strict` prevents cross-site attacks without additional CSRF tokens |
| **No localStorage pollution** | Keeps sensitive tokens out of localStorage/sessionStorage (both XSS-vulnerable) |
| **Browser security model** | Leverages decades of browser cookie security implementation |

### Disadvantages and Caveats

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Can't read in JavaScript** | Can't check if refresh token exists client-side | Rely on 401 response from `/auth/refresh` |
| **Subdomain issues** | Cookie domain must match exactly | Set `domain` option if needed (`.example.com` for all subdomains) |
| **Mobile apps** | Native apps don't use cookies naturally | Use token-based auth entirely or web views with cookie support |
| **Size limit** | 4KB per cookie | JWTs are small (hundreds of bytes); not usually an issue |
| **CORS complexity** | Cookies require `credentials: 'include'` in fetch | Must configure CORS properly (this codebase has it) |
| **No cross-domain** | Cookie not sent to different domains | By design — this is a security feature |
| **Server-side storage** | RefreshTokenStore must persist across restarts | Use Redis/database in production (not in-memory) |

**Critical caveat for this codebase:**
```ts
// RefreshTokenStore.ts
/**
 * PRODUCTION WARNING: Use Redis or a database table instead!
 * This store is lost on server restart and doesn't scale horizontally.
 */
const tokenStore = new Map<string, StoredToken[]>();
```

In-memory storage means:
- All tokens lost on server restart (all users logged out)
- Doesn't work with multiple server instances (load balancing)
- Not suitable for production

**Production solution:** Use Redis or a database table to store tokens.

### Best Practices for Cookie-Based Authentication

**1. Always use httpOnly for sensitive tokens**
```ts
// Good (this codebase)
res.cookie("refreshToken", token, { httpOnly: true });

// Bad
res.cookie("refreshToken", token, { httpOnly: false });
localStorage.setItem("refreshToken", token); // XSS vulnerable!
```

**2. Enable Secure in production**
```ts
// Good (this codebase)
secure: process.env.NODE_ENV === "production"

// Better (if you have HTTPS in dev)
secure: true
```

**3. Use SameSite=Strict for same-origin apps**
```ts
// Good (this codebase)
sameSite: "strict"

// Acceptable for cross-site scenarios (embedded widgets)
sameSite: "lax"

// Dangerous (requires Secure flag, still risky)
sameSite: "none"
```

**4. Implement token rotation**
```ts
// This codebase does this correctly
const refresh = async (req: Request, res: Response) => {
    const oldToken = req.cookies.refreshToken;
    // ... validate old token ...
    const newToken = generateNewToken();
    authService.revoke(oldToken);  // Invalidate old
    res.cookie("refreshToken", newToken, options);
};
```

Rotation limits the damage if a token is compromised — it only works once.

**5. Set appropriate expiration**
```ts
// 7 days for refresh token (this codebase)
maxAge: 7 * 24 * 60 * 60 * 1000

// Access tokens should be much shorter (15 minutes)
// Stored in memory, not cookies
```

**6. Persist token store in production**
```ts
// Development (this codebase)
const tokenStore = new Map(); // In-memory

// Production
import Redis from "ioredis";
const redis = new Redis();
await redis.setex(`refresh:${userId}:${tokenId}`, 604800, token);
```

**7. Include metadata for security audit trail**
```ts
// This codebase does this
interface StoredToken {
    userId: string;
    token: string;
    userAgent?: string;  // Track which device
    ipAddress?: string;  // Track location changes
    createdAt: Date;
    expiresAt: Date;
}
```

Helps detect suspicious activity (same user, different IP addresses minutes apart).

**8. Limit concurrent sessions**
```ts
// This codebase does this
const MAX_SESSIONS_PER_USER = 5;
```

Prevents session flooding attacks.

**9. Clear cookies properly on logout**
```ts
// Good (this codebase)
res.clearCookie(config.authConfig.refreshTokenCookieName);
authService.revoke(refreshToken); // Also remove from store

// Bad
res.clearCookie("refreshToken"); // Cookie cleared but token still valid server-side!
```

**10. Use path restrictions when appropriate**
```ts
// If refresh endpoint is only at /auth/refresh
path: "/auth"

// If multiple endpoints need it (this codebase)
path: "/" // Available to all routes
```

### Quick Reference: Cookie Security Checklist

| Setting | Value | Why |
|---------|-------|-----|
| httpOnly | `true` | Prevents XSS theft |
| secure | `true` (production) | HTTPS-only |
| sameSite | `"strict"` or `"lax"` | Prevents CSRF |
| maxAge | 7 days (refresh) / session (access) | Limits exposure window |
| path | `"/"` or specific path | Minimizes scope |
| domain | Omit (same-origin) or `.example.com` (subdomains) | Controls where cookie is sent |

### Common Pitfalls

- **Storing tokens in localStorage** — XSS can steal them. Use httpOnly cookies or memory.
- **Not rotating refresh tokens** — Compromised token works forever (until expiry).
- **Using SameSite=None without understanding** — Opens CSRF attacks.
- **In-memory production storage** — Tokens lost on restart, doesn't scale.
- **Not clearing server-side on logout** — Cookie cleared, but token still valid.
- **Forgetting credentials: 'include'** — Cookies won't be sent from frontend.

```ts
// Frontend must include credentials for cookies to be sent
fetch("http://localhost:4000/v1/auth/refresh", {
    method: "POST",
    credentials: "include",  // Critical!
});
```

### Visual: Cookie Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                      COOKIE LIFECYCLE                           │
└────────────────────────────────────────────────────────────────┘

[Login]
   │
   ├─► Server generates refresh token JWT
   │
   ├─► Server stores token in RefreshTokenStore
   │       tokenStore.set(userId, [{
   │         token: "xyz789",
   │         expiresAt: Date + 7 days,
   │         userAgent: "...",
   │         ipAddress: "..."
   │       }])
   │
   └─► Server sends Set-Cookie header
       Browser receives and stores cookie
       Cookie: refreshToken=xyz789; HttpOnly; Secure; SameSite=Strict

[Every Request to Same Domain]
   │
   └─► Browser automatically attaches cookie
       Request headers: Cookie: refreshToken=xyz789

[Token Refresh]
   │
   ├─► Server reads req.cookies.refreshToken
   │
   ├─► Server validates:
   │   • JWT signature valid?
   │   • Token in RefreshTokenStore?
   │   • Not expired?
   │
   ├─► Server generates NEW refresh token
   │
   ├─► Server revokes old token from store
   │
   ├─► Server stores new token in store
   │
   └─► Server sends Set-Cookie with new token
       Browser replaces old cookie with new one

[Logout]
   │
   ├─► Server revokes token from RefreshTokenStore
   │
   └─► Server sends Set-Cookie with empty value and Max-Age=0
       Browser deletes cookie

[Expiration]
   │
   ├─► maxAge reached → Browser deletes cookie automatically
   │
   └─► expiresAt reached → RefreshTokenStore.validate() returns false
```

---