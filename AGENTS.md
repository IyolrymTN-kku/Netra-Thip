# 👁️ Netra-Thip Core Portal Tools Service - System Architecture & Memory

## 1. Project Overview & Identity
- **Project Name:** Netra-Thip (เนตรทิพย์) Core Portal Tools Service.
- **System Type:** Enterprise ASOC (Application Security Orchestration and Correlation) and Vulnerability Management Platform (Inspired by DefectDojo/Faraday).
- **Core Goal:** Aggregate, Execute, and Normalize 7 distinct Cybersecurity Tools into a single unified Dashboard with AI-driven reporting.

## 2. Tech Stack & Infrastructure
- **Frontend/Backend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4.
- **Orchestration:** n8n (Hidden from UI, triggered via Core Engine Webhooks).
- **Databases:** - **PostgreSQL (Prisma 5):** Relational data (Users, Roles, Projects, Assets, Encrypted API Keys, ScanJobs).
  - **MongoDB:** Document store for flexible Tool Raw Outputs and standard `NormalizedFinding` data.
- **Execution Environment:** Docker (Ephemeral containers for tools).

## 3. Integrated Security Tools (The 7 Pillars)
The system categorizes tools into 3 Execution Strategies:
- **Category 1 (CLI Tools via Docker/n8n):** - `AutoPentestX` (End-to-End Pentest, Python CLI)
  - `Guardian-cli` (AI-Driven Pentest, Python CLI)
  - `VULS` (Vulnerability Scanner, Go CLI)
- **Category 2 (REST API Services):**
  - `Metlo` (API Security Monitoring, Long-running Docker)
  - `Sirius Scan` (Web/Port Scanner, Docker Service)
- **Category 3 (File Ingestion / Parsers):**
  - `Caido` (Intercepting Proxy, JSON Findings Upload)
  - `SILENTCHAIN AI` (Burp Suite Extension, JSON Findings Upload)

## 4. Strict Enterprise Security Rules (CRITICAL)
- **Zero Trust Architecture:** All API endpoints must verify User Session and RBAC (Role-Based Access Control).
- **BYOK (Bring Your Own Key) Encryption:** AI API Keys (OpenAI, Gemini, Codex) provided by users MUST be encrypted using `AES-256-GCM` before storing in PostgreSQL. The `iv` and `authTag` must be stored alongside the encrypted key. 
- **In-Memory Decryption:** Keys are decrypted ONLY in-memory by the Core Engine when passing them as environment variables to Docker/n8n. NEVER expose raw keys to the Frontend or logs.

## 5. Data Normalization Standard
- All raw JSON outputs from the 7 tools MUST be mapped to the `NormalizedFinding` TypeScript Interface.
- Mandatory fields for normalization: `id`, `scanJobId`, `projectId`, `toolName`, `severity` (CRITICAL, HIGH, MEDIUM, LOW, INFO), `title`, `description`, `evidence`, and `remediation`.

## 6. The 6-Step Development Pipeline
For any feature request, bug fix, or refactor, you MUST follow this sequence:
1. **Ask:** Analyze the request and constraints.
2. **Plan:** Draft the architecture, UI changes, or DB schema updates.
3. **Implement:** Write the production-ready code.
4. **Review Diff:** Audit for security flaws, TypeScript errors, and architecture drift.
5. **Run/Test:** Validate build and functionality.
6. **Commit:** Generate Git commit commands with conventional messages.

## 7. UX/UI Design System
- **Theme:** Light/Dark mode toggle. Default to Dark mode (Cyber-security aesthetic).
- **Colors:** Deep Navy (`#0A1628`) background, Electric Blue (`#0066FF`) primary accents.
- **Typography:** Google Font "Prompt" for Thai/English support, "JetBrains Mono" for IP addresses and technical logs.
- **Components:** High information density, glassmorphism on modals, and clear risk-based coloring (Red=Critical, Orange=High, Yellow=Medium).