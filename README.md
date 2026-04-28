# Netra-Thip Core Portal Tools Service

> **เนตรทิพย์** — Enterprise ASOC (Application Security Orchestration & Correlation) and Vulnerability Management platform that aggregates, executes, and normalizes a curated suite of cybersecurity tools into a single dashboard with AI-driven reporting.

---

## 1. Project Overview

Netra-Thip is an internal platform inspired by DefectDojo and Faraday, built to consolidate the output of multiple specialised security tools into a single workflow. It orchestrates seven tools across three execution strategies:

| Category | Strategy | Tools |
| --- | --- | --- |
| **1. CLI** | Python / Go binaries executed in ephemeral Docker containers via n8n | AutoPentestX, Guardian-cli, VULS |
| **2. REST API** | Long-running services queried via HTTP | Metlo, Sirius Scan |
| **3. File Ingestion** | Operator uploads JSON exports | Caido, SILENTCHAIN AI |

All raw output is normalised into a standard `NormalizedFinding` schema, stored in MongoDB, and surfaced through the Next.js dashboard. AI-driven triage and remediation use **BYOK (Bring Your Own Key)** — operator-supplied API keys are encrypted at rest with AES-256-GCM.

---

## 2. Tech Stack

| Layer | Choice |
| --- | --- |
| **Frontend / Backend** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack, React 19) |
| **Language** | TypeScript 5 (strict) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with custom design tokens, Google Fonts (Prompt, JetBrains Mono) |
| **Auth** | [NextAuth v5 (Auth.js)](https://authjs.dev/) with the Prisma adapter and JWT sessions |
| **Relational DB** | [PostgreSQL 16](https://www.postgresql.org/) via [Prisma 5](https://www.prisma.io/) |
| **Document store** | [MongoDB 6](https://www.mongodb.com/) for raw tool output and `NormalizedFinding` documents |
| **Orchestration** | [n8n](https://n8n.io/) (hidden from the UI, triggered via Core Engine webhooks) |
| **Tool execution** | Docker (ephemeral containers per scan) |
| **Encryption** | Node `crypto` AES-256-GCM (BYOK API keys) |
| **Password hashing** | bcryptjs (cost 12) |
| **Testing** | [Vitest](https://vitest.dev/) |

### Architecture highlights

- **Zero Trust** — every API endpoint verifies the user session and RBAC role.
- **BYOK encryption** — AI provider keys (OpenAI, Gemini, Claude) are encrypted with AES-256-GCM before being persisted in PostgreSQL. They are decrypted only in-memory by the Core Engine when forwarded to Docker / n8n. They are never exposed to the browser or to logs.
- **Data normalisation** — every tool's raw output is mapped to a single `NormalizedFinding` interface so that severity, evidence, and remediation render consistently regardless of source.

---

## 3. Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| **Node.js** | `>= 20.x` | The project pins to Node 20 LTS. Newer LTS releases also work. |
| **npm** | `>= 10.x` | Ships with Node 20. |
| **Docker Desktop** | Latest stable | Provides the PostgreSQL and MongoDB containers via `docker-compose.yml`. |
| **OpenSSL** | Any | Used to generate `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`. (Bundled with Git for Windows / macOS / most Linux distros.) |

---

## 4. Getting Started

### 4.1 Clone the repository

```bash
git clone <your-repo-url> netra-thip-portal
cd netra-thip-portal
```

### 4.2 Install dependencies

```bash
npm install
```

### 4.3 Configure environment variables

Copy the template and fill in the secrets:

```bash
cp .env.example .env
```

Generate cryptographic material:

```bash
# NEXTAUTH_SECRET — base64, 32 bytes
openssl rand -base64 32

# ENCRYPTION_KEY — exactly 64 hex characters (32 bytes) for AES-256-GCM
openssl rand -hex 32
```

Paste the values into `.env`. At minimum the following must be set before the first run:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. The default value matches `docker-compose.yml`. |
| `MONGODB_URI` | MongoDB connection string. |
| `NEXTAUTH_SECRET` | JWT signing secret for NextAuth. |
| `NEXTAUTH_URL` | Public base URL of the app (e.g. `http://localhost:3000`). |
| `ENCRYPTION_KEY` | 64-hex-char master key for BYOK encryption. **Rotate carefully — encrypted records cannot be read with a different key.** |
| `ADMIN_EMAIL` | Email for the seeded admin user. |
| `ADMIN_PASSWORD` | Password for the seeded admin user. **Change before any non-dev use.** |

> ⚠️ Never commit a populated `.env` to Git. Only `.env.example` is tracked.

### 4.4 Start the databases

```bash
docker compose up -d
```

This launches two containers:

- `portal_postgres` on port `5432`
- `portal_mongodb` on port `27017`

Verify with `docker ps` — both should report `Up`.

### 4.5 Apply database migrations

```bash
npx prisma migrate dev
```

This creates every table defined in [`prisma/schema.prisma`](prisma/schema.prisma) (User, Project, Asset, ApiKey, ScanJob, plus the NextAuth `Account`, `Session`, and `VerificationToken` tables) and regenerates the Prisma client.

### 4.6 Seed the ADMIN user

```bash
npx prisma db seed
```

This reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`, hashes the password with bcrypt (cost 12), and upserts an `ADMIN` user. The script is idempotent.

### 4.7 Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`. Sign in with the admin credentials from `.env` and you should land on the dashboard.

---

## 5. Available Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Next.js dev server with Turbopack on port 3000. |
| `npm run build` | Type-checks, lints, and produces a production build. |
| `npm run start` | Serves the production build (run `build` first). |
| `npm run lint` | Runs `next lint`. |
| `npm run test` | Runs the Vitest test suite (encryption round-trip + tamper detection). |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run db:seed` | Re-runs the admin seed script. |

---

## 6. Project Structure

```
netra-thip-portal/
├── prisma/
│   ├── schema.prisma          # Prisma data model (Postgres)
│   └── seed.ts                # Idempotent ADMIN bootstrap
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Public login page
│   │   ├── (portal)/          # Authenticated route group
│   │   │   ├── layout.tsx     # Auth gate + AppShell
│   │   │   └── dashboard/     # Operations dashboard
│   │   ├── api/auth/[...nextauth]/  # NextAuth route handlers
│   │   ├── globals.css        # Tailwind v4 tokens + design system
│   │   └── layout.tsx         # Root layout (fonts, theme)
│   ├── components/
│   │   ├── dashboard/         # Hero, KpiCard, KpiRow, Sparkline
│   │   ├── icons/             # Icon library, NetraLogo
│   │   └── layout/            # AppShell, NavRail, TopNav
│   ├── lib/
│   │   ├── db/prisma.ts       # PrismaClient singleton
│   │   └── security/
│   │       ├── encryption.ts  # AES-256-GCM utility (server-only)
│   │       └── encryption.test.ts
│   ├── types/
│   │   └── next-auth.d.ts     # Session/JWT type augmentation
│   ├── auth.config.ts         # Edge-safe NextAuth config
│   ├── auth.ts                # Full NextAuth setup (Prisma + Credentials)
│   └── middleware.ts          # Auth middleware (route protection)
├── docker-compose.yml         # Postgres + MongoDB
├── vitest.config.ts
└── .env.example               # Required environment variables
```

---

## 7. Development Pipeline

Every change — feature, bug fix, or refactor — must follow this **6-step pipeline**. The pipeline keeps changes auditable, reviewable, and aligned with our security posture.

| # | Step | Description |
| --- | --- | --- |
| 1 | **Ask** | Clarify intent, constraints, and scope before touching code. |
| 2 | **Plan** | Draft the architectural / UI / schema changes. Reach alignment before implementation. |
| 3 | **Implement** | Write production-ready code that fulfils the plan. |
| 4 | **Review Diff** | Audit for security flaws, TypeScript errors, architectural drift, unused code, and sensitive values. |
| 5 | **Run / Test** | Validate locally — `npm run test`, `npm run build`, manual UI verification, and Prisma migration sanity. |
| 6 | **Commit** | Conventional commit message, atomic scope, no co-mingled refactors. |

Use `CLAUDE.md` as the canonical reference for the architecture rules that govern these reviews.

---

## 8. Security Notes

- `src/lib/security/encryption.ts` imports `server-only`. It must never be reachable from a Client Component bundle.
- Rotating `ENCRYPTION_KEY` invalidates every previously stored BYOK ciphertext. Plan a re-encryption migration before rotating in any environment that holds production keys.
- The admin seed script is intended for development. Production environments should provision the first ADMIN through a dedicated, audited workflow.
- All `.env*` files except `.env.example` are git-ignored. Confirm with `git status` before committing.

---

## 9. License

Internal project — license to be defined by the platform team. Do not distribute outside the organisation without approval.
