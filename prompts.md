# ROUTELESS — Engineering & Prompt Battle Trajectory Log
## Aerophilia 2K26 | Team Interactive Prompt Engineering Trajectory

> **Log Note:** This document records our team's live prompt trajectory during the 3-hour build. It captures the actual prompts issued to Antigravity, the AI's responses, our critiques, architectural decisions, and our adaptation to the surprise challenge.

---

### Step 1: Solution Exploration & Safeguarding Critique

#### Prompt 1.1
```text
Goal: Help rural students reach college when government buses are limited, cancelled or full.

Context: Many students, few buses, routes sometimes disrupted. I have 3 hours, and the app must be deployed and publicly accessible. I’m using sample data. A surprise requirement may come later, so the design must be easy to change.

Constraints: Free tools only. Web app. Modular: each feature in its own file, data in a separate config file, no hardcoded values. Keep it simple enough to finish in 3 hours.

Task: Don’t write code yet. First:
1. Give 3 different approaches (what it does, build difficulty, one risk).
2. Recommend one and say why.
3. For your recommended one, give the module list and what each module does, and say which modules would change if requirements change.

Output: Short and structured. No code.
```

#### AI Response Excerpt
> *Proposed Approaches:*
> 1. **Ride Coordination Board:** Students post ride requests; local private drivers claim them.
> 2. **Bus Status + Carpooling Hybrid:** Shows bus status; when a bus fails, auto-groups students into carpools with nearby villagers or teachers.
> 3. **Pre-Scheduled Shared Vehicle Planner:** Weekly recurring schedule optimization.
> *Recommendation:* Approach 2 (Bus Status + Carpooling Hybrid).

#### Developer Critique & Correction
> *Our observation:* Approach 2 suggests carpooling with nearby villagers or teachers. In rural areas, many college students are minors. Matching students to unvetted private individuals introduces serious safety and child-protection liabilities.
> *Correction applied:* We strictly prohibited open carpooling. All backup capacity must come from verified, school-contracted, or institution-sanctioned vehicles with known drivers.

---

### Step 2: Merging Problem Specification with Rural UX (ROUTELESS + BusSaathi)

#### Prompt 2.1
```text
We have two product ideas to merge:

Idea A (ROUTELESS): A mobile-first arrival-recovery network. When a bus fails, students report the problem in one tap. A school coordinator confirms the incident. A deterministic Recovery Engine proposes assignments using verified school vehicles only. The coordinator approves the plan. Students who cannot be assigned see an honest "unserved" state with a school escalation option. Main showcase: Bus B2 breaks down, 12 students affected, backup van V1 has 8 free seats -> 8 assigned, 4 unserved. Zero backup -> 0 assigned, 12 unserved. All data labeled simulated.

Idea B (BusSaathi): A student-first platform adding relay route alternatives (config-driven junction hops), crowding forecast chip (Green/Amber/Red based on pending requests), disruption simulation button, and a Kannada-language one-tap report ("Naale bus illa, college hogbeku") parsed into a structured incident.

Task: Merge the best of both ideas. Keep ROUTELESS's coordinator-approval architecture and safety guardrails (no unknown driver matching, verified vehicles only). Add BusSaathi's personality: Kannada input, relay route, crowding chip, disruption simulation. Drop anything that cannot be built in 3 hours or requires real data (no ML demand prediction, no villager ride-pooling, no SMS delivery claims).

Output final merged product specification with feature priority (Must/Should/Stretch), data model, Recovery Engine rules, and a 90-second judge demo script.
```

#### AI Response Excerpt
> *Unified Product Blueprint:*
> - **Core Recovery Loop:** Student Reports Issue -> Coordinator Confirms -> Recovery Engine Proposes -> Coordinator Approves -> Student Receives Verified Pickup or Honest Unserved Escalation.
> - **Rural Additions:** Local language reporting in Kannada with deterministic fallback; Relay route alternative for junction-hopping.
> - **Hard Constraints:** Allocation engine is deterministic; draft proposals do NOT consume seats until coordinator approves.

#### Developer Decision
Approved the merged blueprint (`ROUTELESS_FINAL_PS.md`). Ensured that relay routes remain config-driven junction lookups rather than dynamic graph solvers to protect the 3-hour deadline.

---

### Step 3: Platform Clarification — Web vs. Native

#### Prompt 3.1
```text
bro mobile specific means we have to use react native ??
```

#### AI Response Excerpt
> *Analysis:*
> - Mobile-first does NOT mean React Native. The brief requires a **public deployed project URL** accessible in any browser.
> - React Native requires APK sideloading or emulators, which slows down judge evaluation and adds severe build complexity in 3 hours.
> - A mobile-first web app (Vite + React + TypeScript + Tailwind) designed at a 375px base viewport with large touch targets opens instantly on any judge's phone or laptop.

#### Developer Decision
Confirmed: build as a mobile-first web app, deployed via public URL.

---

### Step 4: Architectural Debate — Frontend-Only vs. Docker + SQLite

#### Prompt 4.1
```text
Wait i didnt get the clear picture like arent we gonna build the backend just the testcase??
then for the problem statment no need of backend just the frontend you are shoeing
No i need proper backend we shoulnt build somethign too simple we need something too good to impress judges bro pelase i want to build and win in prompt also
sqllite and docker how will it be
we will use sqllite and docker
```

#### AI Response Excerpt
> *Architecture Analysis:*
> - Evaluated trade-offs between frontend-only (localStorage), Supabase cloud, and SQLite in Docker.
> - Formulated Docker + Node.js (Hono) + SQLite (`better-sqlite3`) + Server-Sent Events (SSE) architecture:
>   - Backend container running Alpine Linux with compiled sqlite3.
>   - SSE endpoint (`/api/events`) providing live push so coordinator actions immediately update student screens across devices.

#### Developer Decision
Overrode the frontend-only approach. Chose **Node.js (Hono) + SQLite (`better-sqlite3`) + SSE push containerized in Docker**.

---

### Step 5: Parallel Work Division for 4 Engineers

#### Prompt 5.1
```text
okay divide the work among the 4 people
cant we 4 work parallely
bro first we will create the file architecture so that diff person wont mess with it liek what if they create diff ones right then we will do my opart , but bro we are running out of tim i wasnt you to give it quickly
bro just the empty files you create just the stucture so that duplicate files wont caus mess at the end when we merge , so just the completre file structiure now bro
```

#### Action Taken
Created the full 41-file repository skeleton across `backend/` and `frontend/` upfront and committed under `f3efe7c`. Work was partitioned so each developer owned distinct files:
- **Person 1:** Docker, SQLite schema, demo fixtures seed.
- **Person 2:** Recovery Engine, eligibility logic, Vitest tests.
- **Person 3:** Student UI, Kannada input, SSE hook.
- **Person 4:** Coordinator dashboard, approval flow, deployment.

---

### Step 6: Backend Infrastructure & Debugging (Person 1)

#### Prompt 6.1
```text
ok now lets move into my part person 1 now
```

#### Issues Encountered & Concrete Fixes
1. **Native Module Compilation:** Local Windows execution encountered native compilation friction with `better-sqlite3`. Resolved by running build dependencies (`python3`, `make`, `g++`) inside the Alpine Docker environment (`Dockerfile`).
2. **Git Cache Pollution:** Running `git add .` after `npm install` accidentally staged `backend/node_modules/`. Immediately halted the commit, constructed root `.gitignore`, and purged the cache via `git rm -r --cached`.
3. **Database State Verification:** Executed automated script confirming table integrity:
   ```text
   [DB] Connected: routeless.db
   TABLES CREATED: villages, transport_options, transport_villages, transport_blocked_corridors, incidents, incident_villages, help_requests, assignments, scenarios
   --- VERIFIED DATABASE STATE ---
   Villages: 3 | Transport Units: 3 | Incidents: 1 | Help Requests: 12
   ```

---

### Step 7: Adaptation to Official Surprise Challenge — THE EXAM DAY CRISIS

#### Official Hurdle Received from Organizers
```text
SURPRISE HURDLE THE EXAM DAY CRISIS ROUTELESS: THE LAST MILE | AI-Powered Rural Transportation Challenge
THE SCENARIO Imagine it is an important examination day, and suddenly the rural transportation network faces an unexpected crisis:
- Bus breakdown: Two government buses become unavailable due to technical issues.
- Demand surge: Student transportation demand increases by 40%.
- Road blockage: A major road connecting two villages becomes inaccessible due to flooding.
- Time pressure: Several students have examinations scheduled within the next two hours.
YOUR CHALLENGE: Adapt your existing ROUTELESS solution to handle this unexpected crisis. Your system should intelligently reallocate available buses, suggest alternative routes, prioritize students appearing for examinations, and ensure that available transportation resources are used efficiently.
```

#### Developer Prompt 7.1
```text
see this bro properly this is the hurlde did we alreasy mentioned this inour ps before
wait bro lets discuss what apprach did u think of for the hurdle
```

#### Code Adaptation & Verification
1. **Schema Update:** The TypeScript interface `types.ts` already anticipated `isExamDay: boolean`. However, the SQLite database table `help_requests` did not have the column yet. We executed:
   ```sql
   ALTER TABLE help_requests ADD COLUMN is_exam_day INTEGER DEFAULT 0;
   ```
2. **Exam Prioritization Logic:** In `recoveryEngine.ts`, sorted requests by `isExamDay DESC` so students appearing for examinations are evaluated first.
3. **Flood Roadblock Handling:** In `eligibility.ts`, checked against `transport_blocked_corridors`. When Southern Corridor is flooded, vehicles attempting to traverse it are rejected.
4. **Verified Flood Test Output:**
   ```text
   FLOOD TEST RESULT:
   Proposed: 0 | Unserved: 1
   Reason: route_blocked | Explanation: [CRITICAL EXAM ALERT] No verified vehicle with available seats before 09:00 AM deadline. Escalate to Institution Exam Transport Escort.
   ```
5. **Verified Crisis Allocation Output (17 students, +40% surge):**
   ```text
   --- TESTING THE EXAM DAY CRISIS SCENARIO ---
   Total Affected: 17 (+40% surge over 12)
   Exam Students:  10
   Proposed Rescue: 8 (All 8 seats on Van V1 awarded to Exam Students STU-001 through STU-008)
   Unserved:       9 (2 Exam Students + 7 Regular Commuters)

   Top Proposals:
    - [STU-001] [EXAM PRIORITY] Allocated seat on verified Van V1. Strict arrival before 09:00 AM.
    - [STU-002] [EXAM PRIORITY] Allocated seat on verified Van V1. Strict arrival before 09:00 AM.

   Unserved State (Honest Escalation):
    - [STU-009] (Exam: true) Reason: no_capacity -> [CRITICAL EXAM ALERT] No verified vehicle with available seats before 09:00 AM deadline. Escalate to Institution Exam Transport Escort.
    - [STU-011] (Exam: false) Reason: no_capacity -> Capacity or route constraints prevented automated rescue.
   ```

---

### Step 8: Final Prompt — Production Build & Submission Preparation

#### Final Prompt 8.1
```text
Final Submission Preparation:
1. Validate that backend and frontend compile with zero TypeScript errors.
2. Verify Docker container build (docker compose build) succeeds cleanly.
3. Prepare production deployment configuration for Vercel (Frontend) and Railway (Backend).
4. Confirm repository hygiene: public visibility, clean git history, no committed node_modules or credentials.
```

#### Outcome & Verification Status
- **Backend Build:** Passes (`npx tsx` and Docker build succeed).
- **Database Status:** Schema and seed verified with WAL mode.
- **Crisis Allocation:** Verified with 17 students, 8 assigned, 9 unserved (including emergency exam alerts).
- **Public Repository:** https://github.com/ananya-asa/routeless-last-mile

---

### Retrospective: What We Would Do Differently
- **Schema Completeness:** While we defined `isExamDay` in our frontend TypeScript interfaces early, we omitted the physical column in the initial SQLite `schema.sql` file, requiring an `ALTER TABLE` step when the hurdle arrived. In future projects, we would cross-validate the SQL DDL directly against the TypeScript types before running migrations.
- **Offline Reliability:** Given additional time, we would implement an SMS/USSD fallback driver manifest for areas with complete cellular blackout.
