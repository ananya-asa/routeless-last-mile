# ROUTELESS — Engineering & Prompt Trajectory Log
## Aerophilia 2K26 Prompt Battle

---

### Phase 1: Problem Exploration & Initial Scoping

#### Prompt 1.1 — Exploration of Solution Paradigms
```text
Goal: Help rural students reach college when government buses are limited, cancelled, or full.

Context: Many students, few buses, routes frequently disrupted. We have 3 hours total, and the app must be deployed and publicly accessible with sample data. A surprise requirement may come later, so the design must be easy to change.

Constraints: Free tools only. Web app. Modular design: each feature in its own file, data in a separate config file, no hardcoded values. Keep it simple enough to finish in 3 hours.

Task: Do not write code yet. First:
1. Give 3 different approaches (what it does, build difficulty, one risk).
2. Recommend one and say why.
3. For your recommended one, give the module list and what each module does, and say which modules would change if requirements change.

Output: Short and structured. No code.
```

* **AI Output Summary:**
  > Proposed 3 models:
  > 1. Ride Coordination Board (CRUD student requests and driver claims)
  > 2. Bus Status + Carpooling Hybrid (Status tracking + auto-grouping students into shared rides)
  > 3. Pre-Scheduled Shared Vehicle Planner (Weekly recurring schedule optimization)
  > Recommended Approach 2.
* **Human Critique & Risk Caught:**
  > Approach 2 proposed informal carpooling with local private drivers. In a rural context involving student minors, matching students to unvetted private vehicles introduces severe physical safety and child protection liabilities.
* **Correction Prompt 1.2:**
  ```text
  Strict constraint addition: We cannot support open carpooling or unknown driver matching for minors. The system must only allocate verified, institution-sanctioned, or school-contracted backup vehicles. Update the approach so all secondary capacity comes strictly from vetted inventory.
  ```

---

### Phase 2: Domain Synthesis — Merging ROUTELESS with BusSaathi

#### Prompt 2.1 — Synthesis of Recovery Engine and Empathy-Driven UX
```text
We need to merge two concepts into a unified product blueprint:

Concept A (ROUTELESS): Mobile-first recovery network with a coordinator approval loop, hard capacity limits, and an explicit unserved state with school escalation when no seats exist.

Concept B (BusSaathi): Student-first features including Kannada natural-language reporting ("Naale bus illa, college hogbeku"), crowding forecast indicators (Green/Amber/Red), and config-driven junction relay routes.

Task:
Synthesize both into a single Product Specification.
Filter out unrealistic hackathon features (no fake ML without training data, no fake GPS tracking, no payment gateways).
Define the core deterministic invariant: 12 students affected on Bus B2 breakdown, 8 seats available on Van V1 -> exactly 8 proposed, 4 unserved.
```

* **AI Output Excerpt:**
  > *Core Invariant:* `B2 breakdown -> 12 affected requests -> Recovery Engine evaluates Van V1 (capacity: 10, occupied: 2, free: 8) -> 8 proposed assignments, 4 unserved (reason: no_capacity). Coordinator approves -> 8 seats consumed once. 4 unserved students receive 'Request School Assistance' fallback.*
* **Human Decision:**
  Accepted the hybrid model: ROUTELESS supplies the deterministic allocation engine and coordinator guardrails; BusSaathi supplies the Kannada NLP parser, crowding signals, and relay alternatives.

---

### Phase 3: Architectural Architecture & Stack Selection

#### Prompt 3.1 — Architectural Integrity vs. Demo Expediency
```text
Evaluate two technical paths for our 3-hour build under judging criteria:

Path A: Frontend-only React app with localStorage persistence and mock delays.
Path B: Full-stack system using Node.js (Hono), SQLite (better-sqlite3), Server-Sent Events (SSE) for real-time coordinator push, containerized with Docker, deployed to a live backend.

Constraints & Criteria:
- Must demonstrate multi-device synchronization: a coordinator on a laptop confirming an incident must update a student's phone view in real time.
- Must remain deployable within 3 hours using free tiers.
- Which architecture genuinely solves the problem without presenting a superficial mockup?
```

* **AI Initial Stance:** Advised Path A (frontend-only) to minimize build risk within the 3-hour limit.
* **Human Override & Direction:**
  > *"We are selecting Path B. A pure frontend mockup lacks cross-device truth. When a coordinator approves rescue seats on an administrative laptop, stranded students waiting at rural stops need instant push notification on their phones. We will use Hono + SQLite + SSE containerized with Docker."*
* **Architecture Locked:**
  - Backend: Node.js 20 + Hono + `better-sqlite3` + SSE broadcast
  - Container: Alpine Linux with build tools (`python3`, `make`, `g++`)
  - Frontend: React 18 + Vite + TypeScript + Tailwind CSS

---

### Phase 4: Parallel Workflow Decomposition for 4 Engineers

#### Prompt 4.1 — Zero-Conflict Modular Work Split
```text
Context: 4 developers working simultaneously on a single repository for a 3-hour competition.
Architecture: Docker + Hono + SQLite backend with React + Tailwind frontend.

Task:
1. Define a shared interface contract (types.ts) for Minute 0–10 that unblocks all team members.
2. Divide files strictly by owner so no two developers edit the same file before integration.
3. Outline clear exit gates for each role:
   - Person 1: Backend Infrastructure, SQLite schema, demo seed, Docker container.
   - Person 2: Domain Recovery Engine, eligibility invariants, Vitest test suite.
   - Person 3: Student UI, mobile-first commute check, Kannada reporting, SSE listener.
   - Person 4: Coordinator Dashboard, seat controls, proposal approval, deployment.
```

* **Outcome:** Created the complete 41-file repository skeleton upfront. All teammates pull from `main` and work in their isolated files with zero git merge conflicts.

---

### Phase 5: Implementation, Debugging & Infrastructure Verification

#### Prompt 5.1 — Database Scaffolding and Native Binary Build
```text
Task for Person 1:
1. Implement backend/src/db/schema.sql for villages, transport_options, incidents, help_requests, assignments, and scenarios.
2. Write backend/src/db/seed.ts with deterministic demo fixtures: Villages A/B/C, Buses B1/B2, backup Van V1 with 8 free seats, and 12 pseudonymous Village C student requests.
3. Configure backend/Dockerfile using node:20-alpine with native compile dependencies (python3, make, g++) to ensure better-sqlite3 compiles reliably.
4. Provide a standalone verification script to inspect database state without launching long-running processes.
```

* **Encountered Issues & Solutions:**
  1. *Native Dependency Failure:* Local Windows npm execution lacked native C++ headers. Solved by building inside the containerized Alpine Docker environment.
  2. *Git Hygiene Leak:* Initial `git add .` attempted to stage `backend/node_modules/` and local `.db` files. Caught immediately; created root `.gitignore` and purged cache via `git rm -r --cached`.
* **Verified Database Output:**
  ```text
  [DB] Connected: E:\PromptBattle\routeless-last-mile\data\routeless.db
  TABLES CREATED: villages, transport_options, transport_villages, transport_blocked_corridors, incidents, incident_villages, help_requests, assignments, scenarios
  --- VERIFIED DATABASE STATE ---
  Villages:        3 (Village A, Village B, Village C)
  Transport Units: 3 (Bus B1, Bus B2 [disrupted], Van V1 [backup: 8 free seats])
  Incidents:       1 (B2 Breakdown - reported)
  Help Requests:   12 (Pending Village C Students STU-001 through STU-012)
  ```

---

### Phase 6: Domain Allocation Engine & Invariant Testing (Person 2)

#### Prompt 6.1 — Recovery Engine Rules & Safety Invariants
```text
Implement backend/src/domain/recoveryEngine.ts and backend/src/domain/eligibility.ts:
Rules:
1. Only evaluate requests linked to CONFIRMED incidents.
2. Filter transport options: must be verified, active, route-compatible, and reach campus before class cutoff (540 min / 09:00 AM).
3. Compute available seats = capacity - occupied_seats - existing confirmed assignments.
4. Greedily allocate eligible students in deterministic order; never overbook.
5. For any unallocated student, assign a specific reason code ('no_capacity', 'incompatible_route', 'too_late').
6. Write Vitest unit tests in backend/src/tests/engine.test.ts validating:
   - 12 Village C requests + 8 Van V1 seats -> exactly 8 proposed, 4 unserved.
   - Zero backup scenario -> 0 proposed, 12 unserved.
   - Duplicate approvals never double-allocate seats.
```

---

### Phase 7: Adaptation to Official Surprise Challenge — THE EXAM DAY CRISIS

#### Official Surprise Hurdle Received:
> **SURPRISE HURDLE: THE EXAM DAY CRISIS**
> *It is an important examination day. Sudden rural transport crisis:*
> 1. **Bus breakdown:** Two government buses unavailable.
> 2. **Demand surge:** Demand increases by +40%.
> 3. **Road blockage:** Major road connecting two villages inaccessible due to flooding.
> 4. **Time pressure:** Several students have examinations scheduled within the next 2 hours.
> *Challenge:* Adapt ROUTELESS to intelligently reallocate available buses, suggest alternative routes, prioritize students appearing for examinations, and minimize students missing exams.

#### Prompt 7.1 — Adapting Engine to the Exam Day Crisis
```text
Surprise Hurdle Adaptation:
1. Data Model Extension: Ensure help_requests tracks is_exam_day: boolean and target_deadline_min: number.
2. Demand Surge (+40%): Expand request fixture from 12 to 17 students, with 10 flagged as having immediate board exams (09:00 AM strict cutoff).
3. Dual Bus Failure: Mark both Bus B1 and Bus B2 as broken down/cancelled.
4. Flooded Roadblock: Set Southern corridor (Village C direct link) as blocked.
5. Optimization Logic in recoveryEngine.ts:
   - Priority Tier 1: Students with is_exam_day = true sorted by earliest exam start time.
   - Priority Tier 2: Regular commuters.
   - Flood bypass / Relay route: Route students from Village C through Northern dry junction (Village B) to connect with remaining backup transport.
   - Zero Tolerance: Exam students arriving > deadline must NOT receive false confirmations; trigger priority emergency school escort.
```

* **Modules Modified:**
  - `backend/src/domain/recoveryEngine.ts` (added 2-tier exam prioritization & relay hop)
  - `backend/src/domain/eligibility.ts` (enforced strict zero-grace exam deadline)
  - `backend/src/routes/scenarios.ts` (added `SCN-EXAM-CRISIS` preset button)
  - `frontend/src/components/StatusChip.tsx` (added `EXAM PRIORITY` badge)

---

### Phase 8: Final Deployment & Multi-Device Verification

#### Prompt 8.1 — Deployment Orchestration
```text
Final Stage:
1. Build and verify the frontend production bundle (npm run build).
2. Configure frontend/src/api/client.ts with environment-aware VITE_API_URL fallback.
3. Deploy frontend to Vercel and backend to Railway with SQLite volume persistence.
4. Execute an end-to-end verification across two separate browser sessions:
   - Session A (Mobile view): Student reports B2 absence in Kannada.
   - Session B (Desktop view): Coordinator confirms breakdown and triggers recovery analysis.
   - Verification: Session A receives real-time SSE update showing Van V1 boarding pass at 07:45 AM.
```

---

### Retrospective: What We Would Do Differently
* If given more time, we would implement optimistic client-side UI updates to smooth over poor rural 2G mobile connectivity before the SSE event resolves.
* We would generate downloadable offline PDF/SMS manifest cards for drivers operating in dead zones without cellular reception.
