# ROUTELESS — Engineering & Prompt Battle Trajectory Log
## Aerophilia 2K26 | Team Interactive Prompt Engineering Trajectory

> **Overview:** This document logs the end-to-end prompt engineering trajectory for **ROUTELESS: The Last Mile**. Rather than a static set of generic one-shots, it documents the iterative dialogues, architectural critiques, technical doubts, stack decisions, and real-time adaptation to the official surprise challenge under a 3-hour timer.

---

### Step 1: Initial Solution Exploration & Safeguarding Critique

#### Developer Prompt 1.1
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

#### AI Response Excerpt
> *Proposed Approaches:*
> 1. **Ride Coordination Board:** Students post ride requests; local private drivers claim them.
> 2. **Bus Status + Carpooling Hybrid:** Shows bus status; when a bus fails, auto-groups students into carpools with nearby villagers or teachers.
> 3. **Pre-Scheduled Shared Vehicle Planner:** Weekly batch schedule optimization.
> *Recommendation:* Approach 2 (Bus Status + Carpooling Hybrid).

#### Developer Doubt & Critique
> *"Wait, Approach 2 suggests carpooling with nearby villagers. In rural areas, many college students are minors. Encouraging students to get into private cars or auto-rickshaws with unvetted private individuals introduces serious safety risks. We cannot have crowdsourced ride-pooling."*

#### Reconstructed Decision Prompt 1.2
```text
Constraint Correction:
Child and student safeguarding is a non-negotiable invariant. Reject crowdsourced private carpooling. The recovery system must allocate ONLY verified, school-contracted, or institution-sanctioned backup vehicles. Update the architecture so every backup seat belongs to vetted inventory with a verified driver contact.
```

---

### Step 2: Merging Problem Specification with Rural UX (ROUTELESS + BusSaathi)

#### Developer Prompt 2.1
```text
We have two complementary product perspectives to synthesize:

Perspective A (ROUTELESS): The coordinator-approval loop, capacity-bounded allocation engine, and honest 'unserved' state when seats are exhausted.
Perspective B (BusSaathi): Empathy-first student interface with Kannada natural language reporting ("Naale bus illa, college hogbeku"), crowding forecast signals (Green/Amber/Red), and config-driven junction relay routes.

Task:
Synthesize both into a single cohesive Product Specification.
Drop anything that cannot be credibly finished in 3 hours (no fake ML predictions without historical data, no fake real-time bus GPS, no payment gateways).
Ensure all demo data is explicitly labeled SIMULATED / DEMO.
```

#### AI Response Excerpt
> *Unified Product Blueprint:*
> - **Core Recovery Loop:** Student Reports Issue -> Coordinator Confirms Disruption -> Recovery Engine Proposes Bounded Allocation -> Coordinator Approves -> Student Receives Boarding Pass or Honest Unserved Escalation.
> - **Rural Additions:** Local language reporting in Kannada with rule-based/LLM fallback; Relay route alternative for junction-hopping.
> - **Safety Guarantee:** Allocation engine is deterministic; draft plans do not consume seats until explicit coordinator approval.

#### Developer Decision
Approved the merged blueprint. Confirmed that the "Relay Route" feature must remain purely data/config-driven (junction hops) to avoid complex routing graph computation during the sprint.

---

### Step 3: Mobile Web vs. React Native Clarification

#### Developer Doubt & Question
> *"Wait, the brief says 'mobile-first'. Does that mean we have to use React Native?"*

#### Reconstructed Evaluation Prompt 3.1
```text
Clarification on Platform Constraints:
The challenge specifies a mobile-first application accessible via a public deployed URL within a 3-hour window.
Evaluate:
1. Does 'mobile-first' require React Native / mobile app bundles (APK)?
2. What are the build and review trade-offs between React Native and a responsive Web App (React + Vite + Tailwind)?
3. How do hackathon judges access the demonstration?
```

#### AI Response Excerpt
> *Analysis:*
> - **React Native:** Requires Expo/native compilation, mobile emulators, or local APK sideloading. Cannot be opened instantly via a standard public URL in a web browser. High setup risk for a 3-hour deadline.
> - **Mobile-First Web App:** Designed at 375px viewport with touch-friendly 48px hit targets, responsive Tailwind layouts, and instant deployment via Vercel. Any judge can test it immediately on their mobile phone or laptop browser.
> *Conclusion:* Mobile-First Web App completely fulfills the brief with zero deployment friction.

#### Developer Decision
Standardized on **React + Vite + TypeScript + Tailwind CSS** running as a mobile-first web app.

---

### Step 4: Architectural Debate — Frontend-Only vs. Docker + SQLite Backend

#### Developer Doubt & Challenge
> *"Wait, I didn't get the clear picture — aren't we going to build a real backend? If we just build frontend with localStorage, it looks like a fake demo. We want to impress the judges with a real working system where coordinator actions reflect on the student's phone."*

#### Reconstructed Architectural Prompt 4.1
```text
Architecture Debate:
The AI proposed a frontend-only prototype with localStorage persistence to maximize speed.
However, our team requires a credible two-sided demonstration:
- Coordinator on a desktop approves a rescue plan.
- Student on a separate mobile phone receives an immediate real-time update.

Task:
Compare two real backend architectures:
1. Supabase (Hosted PostgreSQL + Realtime)
2. Self-contained Docker + Node.js (Hono) + SQLite (better-sqlite3) + Server-Sent Events (SSE)

Evaluate by: Setup time, deployment stability, zero-cost reliability, and judge impression.
```

#### AI Response Excerpt
> *Comparison:*
> - **Supabase:** Hosted in the cloud, but requires third-party account configuration, API key distribution across the team, and external dashboard setup.
> - **Docker + SQLite + SSE:** 100% self-contained within our repository. No external services or accounts needed. `better-sqlite3` provides lightning-fast in-memory/file transactions. Server-Sent Events (SSE) provides lightweight one-way real-time push to student devices.
> *Verdict:* Docker + SQLite + SSE provides complete self-contained independence and full-stack credibility.

#### Developer Decision
**Overrode frontend-only recommendation.** Selected **Node.js (Hono) + SQLite (`better-sqlite3`) + SSE push + Docker** for the backend, alongside React for the frontend.

---

### Step 5: Parallel Work Division for 4 Engineers

#### Developer Doubt & Question
> *"Can't all 4 of us work in parallel right now? How do we split the work so we don't overwrite each other's files or cause merge conflicts?"*

#### Reconstructed Workflow Prompt 5.1
```text
Team Organization:
We have 4 developers and 100 minutes of active implementation time remaining.
Stack: Docker + Hono + SQLite (Backend) and React + Tailwind (Frontend).

Task:
1. Define a shared contract (types.ts) created in the first 10 minutes so all members share identical models.
2. Partition the codebase into 4 non-overlapping modular domains:
   - Person 1 (You): Backend Infrastructure, SQLite schema, demo fixtures, Docker container.
   - Person 2: Domain Recovery Engine, constraint logic, Vitest automated test suite.
   - Person 3: Student UI, mobile-first commute check, Kannada reporting, SSE listener.
   - Person 4: Coordinator Dashboard, vehicle capacity controls, approval dispatch, cloud deployment.
3. Pre-create the entire file structure with stub files so nobody creates conflicting filenames.
```

#### AI Response & Action Taken
Created the 41-file repository skeleton across `backend/` and `frontend/` upfront. Committed under commit `f3efe7c`. All 4 developers pull from `main` and work in isolated directories.

---

### Step 6: Backend Infrastructure Execution & Debugging (Person 1)

#### Reconstructed Prompt 6.1
```text
Implement Person 1 deliverables:
1. backend/src/db/schema.sql defining tables: villages, transport_options, incidents, help_requests, assignments, scenarios.
2. backend/src/db/seed.ts seeding initial showcase fixtures: Villages A/B/C, Bus B1, Bus B2 (breakdown reported), backup Van V1 (8 free seats), and 12 pseudonymous Village C student requests.
3. backend/Dockerfile containerizing the service with node:20-alpine.
4. Verify database creation and table row counts using a standalone script.
```

#### Issues Encountered & Resolution Loops
1. **Native Module Compilation:** Local Windows execution encountered native compilation friction with `better-sqlite3`. Resolved by running build dependencies (`python3`, `make`, `g++`) inside the Alpine Docker environment.
2. **Git Cache Pollution:** Running `git add .` after `npm install` accidentally staged `node_modules`. Immediately halted the commit, constructed `.gitignore`, and purged the cache via `git rm -r --cached`.
3. **Database State Verification:** Executed verification test confirming:
   ```text
   [DB] Connected: routeless.db
   TABLES CREATED: villages, transport_options, transport_villages, transport_blocked_corridors, incidents, incident_villages, help_requests, assignments, scenarios
   --- VERIFIED DATABASE STATE ---
   Villages: 3 | Transport Units: 3 | Incidents: 1 | Help Requests: 12
   ```

---

### Step 7: Adaptation to Official Surprise Challenge — THE EXAM DAY CRISIS

#### Official Hurdle Received from Hackathon Organizers
> **SURPRISE HURDLE: THE EXAM DAY CRISIS**
> *It is an important examination day. Sudden rural transport crisis:*
> 1. **Bus breakdown:** Two government buses unavailable due to technical issues.
> 2. **Demand surge:** Student transportation demand increases by +40%.
> 3. **Road blockage:** Major road connecting two villages inaccessible due to flooding.
> 4. **Time pressure:** Several students have examinations scheduled within the next 2 hours.
> *Challenge:* Adapt ROUTELESS to intelligently reallocate available buses, suggest alternative routes, prioritize students appearing for examinations, and minimize students missing exams.

#### Developer Review & Check
> *"Wait, did we already anticipate parts of this in our initial specification?"*
> **Answer:** Yes! Our initial `types.ts` already had `isExamDay: boolean`, our spec enforced *"zero tolerance for exams"*, and our database had `transport_blocked_corridors`. Now we must extend the live engine to handle all 4 crisis factors simultaneously.

#### Reconstructed Adaptation Prompt 7.1
```text
Adapt Recovery Engine to The Exam Day Crisis:
1. Data Model: Add is_exam_day: boolean to help_requests table.
2. Demand Surge (+40%): Expand request fixture to 17 students (10 taking board exams at 09:00 AM).
3. Dual Bus Failure: Mark both Bus B1 and Bus B2 as broken down/cancelled.
4. Flooded Roadblock: Set Southern corridor (direct route to Village C) as blocked.
5. Optimization Logic in recoveryEngine.ts:
   - Priority Tier 1: Students with is_exam_day = true sorted by deadline.
   - Priority Tier 2: Regular commuters.
   - Flood bypass / Relay route: Route students from Village C through Northern dry junction (Village B) to connect with remaining backup transport.
   - Zero Tolerance: If seats are exhausted, exam students must receive immediate [CRITICAL EXAM ALERT] triggering priority school escort.
```

#### Automated Verification Output
```text
--- TESTING THE EXAM DAY CRISIS SCENARIO ---
Total Affected: 17 (+40% demand surge)
Exam Students:  10
Proposed Rescue: 8 (All 8 seats on Van V1 awarded to Exam Students STU-001 through STU-008)
Unserved:       9 (2 Exam Students + 7 Regular Students)

Top Proposals:
 - [STU-001] [EXAM PRIORITY] Allocated seat on verified Van V1. Strict arrival before 09:00 AM.
 - [STU-002] [EXAM PRIORITY] Allocated seat on verified Van V1. Strict arrival before 09:00 AM.

Unserved State (Honest Escalation):
 - [STU-009] (Exam: true) Reason: no_capacity -> [CRITICAL EXAM ALERT] No verified vehicle with available seats before 09:00 AM deadline. Escalate to Institution Exam Transport Escort.
 - [STU-011] (Exam: false) Reason: no_capacity -> Capacity or route constraints prevented automated rescue.
```

---

### Step 8: Multi-Device Deployment & Final Judge Walkthrough

#### Reconstructed Final Deployment Prompt 8.1
```text
Final Stage:
1. Verify frontend production build (npm run build).
2. Wire frontend API client with environment-aware VITE_API_URL fallback.
3. Deploy frontend to Vercel and backend to Railway with SQLite persistence.
4. Execute an end-to-end verification across two separate browser sessions:
   - Session A (Mobile view): Student reports B2 absence in Kannada.
   - Session B (Desktop view): Coordinator confirms breakdown and triggers recovery analysis.
   - Verification: Session A receives real-time SSE update showing Van V1 boarding pass at 07:45 AM.
```

---

### Retrospective: What We Learned & Would Do Differently
1. **Anticipating Invariants Saved Us:** Modeling `isExamDay` and `blockedCorridors` into our initial schema allowed us to adapt to the surprise challenge in under 15 minutes instead of redesigning the data layer from scratch.
2. **Honesty Beats Fabrication:** The easiest hackathon mistake is pretending every student gets a ride. Showing a clear, prioritized escalation for the 2 unserved exam students proves the system is an honest decision-support tool, not an imaginary ride-hailing app.
3. **Future Extension:** With additional time, we would build offline-first SMS/USSD manifest broadcasting for drivers operating in rural cellular shadow zones.
