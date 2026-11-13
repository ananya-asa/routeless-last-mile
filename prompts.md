# ROUTELESS — Prompt Battle Iteration & Decision Log
## Aerophilia 2K26 | Team Prompt Engineering Trajectory

> **Judging Context:** Real-world systems aren't built in a single unedited prompt. This document captures our true conversational iteration loops: problem exploration, architectural course corrections, technical debugging, and constraint defense under a 3-hour timer.

---

### Phase 1: Problem Exploration & Architectural Trade-offs

#### Prompt 1.1 — Exploration of Paradigms
```text
Goal: Help rural students reach college when government buses are limited, cancelled, or full.
Context: Many students, few buses, routes disrupted. 3 hours, deployed & publicly accessible.
Constraints: Free tools only. Web app. Modular architecture. No hardcoded values.
Task: Give 3 different approaches (what it does, difficulty, risk). Recommend one and break down modules.
```

* **AI Output:** Proposed 1) Ride coordination board, 2) Bus status + carpool hybrid, 3) Pre-scheduled vehicle planner. Recommended Approach 2.
* **Critique & Flaw Identified:** Approach 2 proposed generic crowdsourced carpooling. In rural Indian student settings with minors, carpooling with unknown private vehicles violates child safeguarding.
* **Loop / Prompt 1.2 (Course Correction):**
  > *"Refine Approach 2 to only allow verified school-contracted or institution-authorized vehicles. No unverified rides or unknown driver matching."*

---

### Phase 2: Idea Synthesis — Merging ROUTELESS with BusSaathi

#### Prompt 2.1 — Synthesizing Formal Constraints with Rural Human Context
```text
Merge two complementary product concepts:
- Concept A (ROUTELESS): Coordinator approval loop, deterministic constraints, honest unserved state when zero seats remain.
- Concept B (BusSaathi): Student-first panic relief, Kannada local language reporting ("Naale bus illa, college hogbeku"), crowding forecast chip (Green/Amber/Red), and relay-route hopping.
Task: Create a unified Product Specification. Filter out unrealistic claims (no fake ML predictions without historical data, no fake GPS).
```

* **Output Analysis:** High-scoring balance. Preserved strict safety invariants from ROUTELESS while adding high-empathy rural usability from BusSaathi.
* **Decision Gate:** The "Relay Route" feature was approved only as a config-driven lookup, preventing complex graph-routing algorithmic bloat during a 3-hour sprint.

---

### Phase 3: The Architecture Debate (Frontend-Only vs. Docker + SQLite)

#### Prompt 3.1 — The Realistic Stack Question
```text
Question: Can we achieve this with frontend-only (localStorage), or do we need a real backend to genuinely impress judges?
```

* **First AI Suggestion:** Suggested sticking to frontend-only to guarantee deployment speed in 3 hours.
* **Human Rejection & Feedback Loop:**
  > *"No, we need a real backend. We shouldn't build something too trivial. We need a live multi-device demo where coordinator actions immediately reflect on the student's phone."*
* **Architecture Decision (Prompt 3.2):**
  Adopt **Node.js (Hono) + SQLite (`better-sqlite3`) + Server-Sent Events (SSE) + Docker container**.
  - **Why Hono over Express?** Modern TypeScript, lighter, zero-dependency startup.
  - **Why SSE over WebSockets?** Native browser reconnection, zero external client library, lightweight one-way coordinator push.

---

### Phase 4: Parallel Team Workflow Design (4 Members)

#### Prompt 4.1 — Solving Team Blocking
```text
Context: 4 developers working simultaneously for 3 hours. How do we avoid merge conflicts and idle waiting?
Task: Create a work division that unblocks parallelism from minute 10.
```

* **Iteration Result:** Identified that teammates block each other if types aren't standardized.
* **Resolution:**
  - **Minute 0–10:** All 4 agree on `types.ts` and directory structure upfront.
  - **Person 1 (Backend Infra):** Docker, SQLite schema, demo fixtures seed.
  - **Person 2 (Domain Engine):** Allocation algorithm, eligibility rules, Vitest unit tests.
  - **Person 3 (Student UI):** Mobile-first commute check, Kannada reporting, SSE hook.
  - **Person 4 (Coordinator UI & Deploy):** Multi-device control board, approval flow, Vercel/Railway deploy.

---

### Phase 5: Debugging & Infrastructure Verification (Person 1 in Practice)

#### Iteration Loop 5.1 — Database Scaffolding & Native Modules
* **Problem:** `better-sqlite3` is a native C++ Node addon. Windows terminal environments without complete build tools often fail compilation during local `npm install`.
* **Prompt to Fix:**
  > *"Containerize the backend with Docker so native sqlite dependencies build cleanly in an isolated Linux environment (node:20-alpine with python3/make/g++)."*
* **Outcome:** `Dockerfile` and `docker-compose.yml` successfully built the image and tested the schema.

#### Iteration Loop 5.2 — Git Hygiene & `.gitignore` Leak Prevention
* **Incident:** Running `git add .` after `npm install` attempted to stage hundreds of files inside `backend/node_modules/` and local `routeless.db`.
* **Immediate Intervention:** Aborted commit task, established root `.gitignore`, stripped `node_modules` from git index cache via `git rm -r --cached`, leaving working tree clean and lightweight.

---

### Phase 6: Verification & Proof of Deterministic State

#### Prompt 6.1 — Database Invariant Verification
```text
Task: Run an automated verification script against SQLite to prove seed consistency without launching long-lived background servers.
```

* **Verified Output:**
  ```text
  [DB] Connected: E:\PromptBattle\routeless-last-mile\data\routeless.db
  TABLES CREATED: villages, transport_options, transport_villages, transport_blocked_corridors, incidents, incident_villages, help_requests, assignments, scenarios
  --- VERIFIED DATABASE STATE ---
  Villages:        3
  Transport Units: 3
  Incidents:       1 (B2 Breakdown)
  Help Requests:   12 (Pending Village C Students)
  ```
* **Status:** Ground truth established. Person 2 (Domain Engine) and Person 3 (Student UI) can now bind directly to persistent SQLite tables.
