# ROUTELESS — Rural Student Arrival Assurance Network
## ROUTELESS: The Last Mile | 3-Hour Prompt Battle Build Blueprint

> **Tagline:** When the bus fails, the journey shouldn't end.
>
> **Product promise:** Help students and school transport coordinators respond to missing, delayed, full, or disrupted buses using verified spare transport capacity, transparent allocation, and honest escalation when no vehicle is available.
>
> **Important distinction:** This is a prototype decision-support system, not an actual government bus dispatch service. All seeded transport information, ETA estimates, and school actions must be labeled **DEMO / SIMULATED** until verified operational feeds and partner organizations exist.

---

# 1. What the official brief actually requires

**Source:** `PromptBattle_Aerophilia2K26.pdf`, 1 page, titled *ROUTELESS: THE LAST MILE — AI-Powered Rural Transportation Challenge*.

**Explicit problem:** Rural students depend on limited government buses, which may be unavailable, disrupted, or overcrowded. Teams may build a transport platform, intelligent allocation system, route optimization, prediction system, simulation, or another creative solution.

**Constraints:** Build in **3 hours**; submit a **public deployed project URL**, **public GitHub repository URL**, and provide a **functional project demonstration**. Evaluation considers **prompt quality and iterations, AI utilization, creativity, problem solving, debugging, adaptability to a surprise challenge, and final working quality**.

**Our design interpretation (not stated as a requirement by the brief):** Winning value comes from helping a student recover from a failed commute, not simply displaying bus routes. The prototype should demonstrate a credible *closed loop*: signal -> triage -> allocate -> approve -> inform -> escalate.

---

# 2. The core problem and its outliers

## Three core failure cases

1. **Availability failure** — no bus comes, bus is cancelled, or bus breaks down.
2. **Capacity failure** — students outnumber the available safe seats.
3. **Route failure** — a road closure, weather event, late service, or detour makes the intended trip infeasible.

## Underlying constraints

- Demand is hard to observe when students board in multiple villages.
- Schools lack a central picture of stranded students.
- Spare capacity is fragmented across different approved vehicles.
- Student arrival has a deadline, especially for examinations.
- A route recommendation can be unsafe or useless if the vehicle is unverified, full, or late.
- A school cannot dispatch vehicles it does not own or control; the system must offer recommendations, not pretend to issue official orders.

## Edge-case matrix

| Outlier | Correct behavior | Prototype treatment |
|---|---|---|
| **No vehicle available** | Never invent a ride; show unserved state and school-assistance escalation | Required |
| **Demand > seats** | Never overbook; preserve explicit waitlist | Required |
| **Two simultaneous disruptions** | Evaluate combined demand against same available capacity | Required |
| **Unverified student report** | Report creates a signal; only coordinator confirms an operational incident | Required |
| **Vehicle claimed by two groups** | Count seats once, across all pending approvals | Required |
| **Suggested van does not serve a village** | Mark ineligible, even if it has space | Required |
| **Arrival after class/exam deadline** | Do not promise on-time arrival; use configured cutoff | Required |
| **App offline** | Display cached schedule and queued state; do not imply report sent to school | Required, with truthful demo copy |
| **Request cancelled / no-show** | Release a previously allocated seat and replan | Required if time allows |
| **Accessibility needs** | Do not match a student to an unsuitable vehicle | Configurable, future-pilot need; simple eligibility check if feasible |
| **Student is a minor** | Never match with random unknown drivers; only verified institution-sanctioned transport | Required safety guard |
| **Route blocked by flooding** | Remove options traversing blocked corridor; no unsafe detour assumptions | Required scenario |
| **False reports** | Keep reports unverified pending coordinator confirmation | Required |
| **Shared family phone** | No public student identities or pinpoint tracking in demo | Required |
| **No real ETA data** | Label times as schedule-based estimates | Required |

**Important:** Offline queuing in localStorage is not cross-device delivery. It must be labeled **"Saved on this device; not yet sent"** unless a network request has actually succeeded.

---

# 3. Product definition

## ROUTELESS, in one sentence

**ROUTELESS is a mobile-first arrival-recovery network that turns reports of stranded rural students into a transparent, coordinator-approved plan using available verified school transport—or an explicit unserved escalation when no safe ride exists.**

## Two primary users

### Student

Needs to know: Is my route operating? Can I report a problem in one or two taps? Is there a **verified** alternative? Where and when do I board? What happens if no vehicle can take me?

### School transport coordinator

Needs to know: Which villages and students are affected? Which incidents are confirmed? What verified vehicles and seats are available? Who can be assisted before class? Which students remain unserved? How do I approve and publish a plan?

## Core feature set — MUST deliver

1. **Student commute check:** choose a demo village and institution; see route status and schedule-based arrival information.
2. **One-tap problem reporting:** bus absent, full, delayed, breakdown, route blocked.
3. **Coordinator disruption board:** view grouped incident signals and affected demand; confirm or dismiss.
4. **Verified vehicle inventory:** government bus and authorized institution backup vehicle entries, with route coverage, departure, capacity, and operating state.
5. **Recovery Engine:** propose safe assignments using eligibility, deadline, route compatibility, available seats, and transparent fairness.
6. **Coordinator approval:** inspect, approve, or reject proposals. Only approval changes assigned status; cannot overbook.
7. **Student status view:** pending -> approved pickup/assignment -> waitlisted/unserved -> school support requested.
8. **Scenario simulator:** bus breakdown; overcrowding; blocked road; zero available backup.
9. **Metrics that come from app state:** affected, assignable, confirmed, unserved, utilization. Do not fake impact metrics.
10. **Polished responsive UI, seeded self-contained public demo, reproducible tests, README, GitHub, deployed link.**

## Should-have / stretch

- Optional **AI incident interpretation**: translate free-text incident (including local languages when supported) into a schema-validated incident suggestion using a server-side LLM API; require coordinator confirmation. Strictly avoid collecting or sending names, phone numbers, or student location to the LLM. Deterministic fallback must always work.
- An incident explanation showing **why** a student was or was not eligible.
- CSV import/export for schools later.
- Firebase/Firestore real-time multi-device storage **after** demo end-to-end workflow is stable, with secure roles and transaction-protected bookings.

## Explicit non-goals for the 3-hour build

- No real government bus GPS or inferred live tracking.
- No ride-hailing, unknown-driver offers, automatic vehicle dispatch, SMS/WhatsApp delivery claims, or government integrations.
- No payment system; no biometric data; no precise student location; no collecting minors' real personal information.
- No ML prediction claims without historical training data.
- No OSM offline-map tile downloading or expensive geospatial routing requirement.
- No production identity/authorization system masquerading as a two-tab demo selector.

---

# 4. Specific showcase scenario (all data simulated)

**Scenario:** Three demonstration villages — Village A, Village B, Village C — commute to Demo District College. Bus B2 serves Village C but breaks down. Twelve students there need to arrive for class. An approved institution van V1 serves Village C, has eight genuinely available seats, and can arrive before the configured deadline.

**Expected result:**

- Coordinator confirms B2 breakdown.
- System recognizes 12 affected students.
- Recovery Engine produces a draft with **8 eligible proposed placements**, **4 unserved**.
- It shows the pickup stop/time for those 8, based on demo configuration.
- Coordinator approves the proposal, which consumes those 8 seats *once*.
- Four remaining students see **No confirmed vehicle** with a request-for-school-assistance option.
- On rerun, no double assignment or seats magically reappearing.
- Switching to "Zero backup" results in **0 assigned / 12 unserved**, not fabricated options.

**Demo fixture data contract:**

- `villages`: A, B, C with explicit corridor and simulated travel time.
- `institution`: one demo college, `classStartsAt = 09:00` in **demo local time**.
- `transportOptions`: B1 regular, B2 disrupted, V1 verified backup. V1 capacity/remaining seats = 8; route includes Village C; arrival before class start. All data clearly marked demo.
- `students`: 12 pseudonymous requests from Village C, IDs such as `STU-001`; include a small assortment of other commuters for dashboard context.
- `incident`: B2 breakdown, initially reported/unverified, confirmed by coordinator during demo.
- `clock`: display **"Demo scenario: 08:00"** rather than assuming the current real time, so the showcase works when judges open it later.

## 90-second judge demo script

1. **Open student view**: Choose Village C; report "Bus not coming". Show one-tap report and clear *reported / not yet confirmed* state.
2. **Switch to coordinator view**: Confirm B2 breakdown and show 12 impacted students (pre-seeded demo requests may already exist; avoid double counting the newly reported one).
3. **Run Recovery Engine**: Show **8 possible placements, 4 unserved**, with eligibility reason and capacity math.
4. **Approve plan**: Student assignment status becomes visible in the demo and 8 seats are consumed.
5. **Show honesty**: Four students have no verified pickup, but can request school support.
6. **Switch scenario to zero-backup**: Show zero assignments, no fabricated recommendations.

**Judges' proof:** This is not a screenshot or pre-scripted popup. Buttons mutate data, state persists after refresh, algorithms enforce hard constraints, and tests confirm results.

---

# 5. Recommended implementation architecture

**For the competition, prioritize a self-contained deployed web demo that works from any public browser.**

### Stack

- **Vite + React + TypeScript** — quick, robust static deployment.
- **Tailwind CSS + lucide-react** — mobile-first design and clear status icons.
- **React Context + reducer** (or lightweight Zustand) — one canonical application state; no duplicated business logic.
- **localStorage** — persistent single-browser demo state; scenario reset; no server dependencies.
- **Vitest** — recovery-engine invariant and edge-case testing.
- **Vercel or Cloudflare Pages** — static deployment; GitHub public repository. Choose one hosting provider for the project, not both.
- **Optional only after core works:** Vercel `/api/triage` + server-side Gemini API (`@google/genai`, schema validation). All LLM output is *suggestion-only*.

### Why not require Firebase on day one?

Firestore is appropriate for a future multi-device pilot, but auth, security rules, multi-device synchronization, coordinator access control, and safe seat transactions take time. A fake open-admin Firestore deployment is not a credible production system. If backend integration is later attempted, use authenticated school roles, fine-grained rules and atomic transactions — not public open writes.

### Suggested folder structure

```text
routeless/
├── src/
│   ├── components/       # shared cards, status chips, modal, empty states
│   ├── pages/            # StudentHome, CoordinatorDashboard
│   ├── data/             # types.ts, demoFixtures.ts, scenarios.ts
│   ├── domain/           # recoveryEngine.ts, eligibility.ts, metrics.ts
│   ├── state/            # reducer.ts, store.tsx, persistence.ts
│   ├── tests/            # engine, reducer, scenario acceptance tests
│   ├── App.tsx
│   └── main.tsx
├── api/                  # OPTIONAL server-side LLM incident triage
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── DECISIONS.md
│   ├── PHASE_LOG.md
│   ├── PROMPT_ITERATIONS.md
│   └── DEMO_SCRIPT.md
├── README.md
├── .env.example
└── package.json
```

### Data model (TypeScript conceptual contract)

```ts
type IncidentStatus = 'reported' | 'confirmed' | 'dismissed';
type VehicleStatus = 'active' | 'delayed' | 'cancelled';
type RequestStatus = 'pending' | 'proposed' | 'confirmed' | 'unserved' | 'escalated';
type IncidentType = 'no_show' | 'full' | 'breakdown' | 'delay' | 'road_block';

type Village = {
  id: string; name: string; corridorId: string;
};
type Student = {
  id: string; villageId: string; institutionId: string;
  classStartMin: number; isExamDay: boolean;
  previousUnservedDays: number;
  needsAccessibleVehicle?: boolean;
};
type TransportOption = {
  id: string; label: string; verified: boolean;
  kind: 'government_bus' | 'institution_vehicle';
  status: VehicleStatus;
  villageIds: string[];
  accessible: boolean;
  capacity: number; occupiedSeats: number;
  departureMin: number;
  arrivalMinByVillage: Record<string, number>;
  blockedCorridorIds: string[];
};
type Incident = {
  id: string; transportOptionId: string;
  type: IncidentType; status: IncidentStatus;
  reportedBy: 'student' | 'coordinator';
  affectedVillageIds: string[]; details?: string;
};
type HelpRequest = {
  id: string; studentId: string; incidentId: string;
  status: RequestStatus; assignedOptionId?: string;
};
type Assignment = {
  id: string; requestId: string; transportOptionId: string;
  status: 'proposed' | 'confirmed' | 'cancelled';
  explanation: string;
};
```

**State principles:** One canonical store; derived metrics; stable IDs; student actions cannot approve transport; draft proposals do not reserve seats; the coordinator's **approval action** rechecks capacity and changes assignments. The demo role selector is an interface switch only, not real access control.

### Recovery Engine: safe deterministic intelligence

Do not ask an LLM to invent routes, seats, or approve assignments. Use transparent hard constraints and a tested heuristic:

```text
INPUT: affected help requests, confirmed incidents, vehicles, configured class deadline

1. Deduplicate help requests by student + incident.
2. Only consider requests tied to CONFIRMED incidents.
3. Exclude disrupted, unverified, or inactive vehicles.
4. Require that a vehicle serves the student's village AND does not cross
   a configured blocked corridor.
5. Require accessible transport if the student's request explicitly needs it.
6. Require ETA <= student's class start (+ a small documented tolerance
   for regular classes; zero tolerance for exams).
7. Compute seatsAvailable = capacity - occupiedSeats - confirmed rescue assignments.
8. Prioritize imminent deadlines / exam days and students with fewer feasible
   alternatives; within comparable priority bands rotate across villages to
   reduce systematic exclusion; break ties deterministically.
9. Produce a DRAFT plan and human-readable reasons; do not reserve seats.
10. For every unmatched request, return a specific reason: no verified option,
    route incompatible, too late, or capacity exhausted.
11. On coordinator approval, re-check every invariant atomically within
    the single-browser reducer transaction; fail safely if state has changed.
12. Record confirmed assignments; recompute availability from canonical state.

OUTPUT: proposed assignments, unserved requests, reason codes, counts.
```

**Terminology:** This is a deterministic, constraint-aware allocation **heuristic**, not a trained predictive ML model or a globally optimal transportation solver. You can call the surrounding product an AI-assisted coordination system if it includes a genuine LLM suggestion feature or is built using AI tools, but be accurate during questions from judges.

### Metrics

- `affected = count(unique requests in confirmed disruption)`
- `eligibleProposals = number of feasible draft assignments`
- `confirmedPlacements = count(confirmed assignments)`
- `unserved = affected - confirmedPlacements` (display a separate *unassigned / awaiting approval* number before approval)
- `seatUsage = occupiedSeats + confirmed rescue assignments` by vehicle
- All counts are **scenario numbers**, not claims about real-world outcomes.

---

# 6. Three-hour execution plan

| Phase | Time box | Clock | Must produce | Exit gate |
|---|---:|---|---|---|
| 0. Lock spec & prompts | 10 min | 00:00–00:10 | PROJECT_SPEC, decision log, phase tracker | Agent has fixed constraints |
| 1. Scaffold + demo domain | 20 min | 00:10–00:30 | Running Vite app, typed fixtures, local persistence, scenario reset | Reload retains correct state |
| 2. Student journey | 25 min | 00:30–00:55 | Village selection, route status, report issue, request status | Student can report and see pending |
| 3. Coordinator workflow | 25 min | 00:55–01:20 | Incident verification, vehicle inventory, dashboard | Coordinator can confirm B2 and inspect demand |
| 4. Recovery Engine | 35 min | 01:20–01:55 | Real algorithm, proposal/approval, tests | 12 affected -> 8 feasible -> 4 unserved; no overbook |
| 5. Connect flows + outliers | 20 min | 01:55–02:15 | End-to-end status, 4 scenarios, empty/error states | Zero-backup and repeat approval safe |
| 6. UX + explainability | 15 min | 02:15–02:30 | Responsive polish, reasons, confidence labels, prompt evidence | Mobile usability check |
| 7. QA, GitHub & deploy | 30 min | 02:30–03:00 | Tested build, README, public repo, public deployed link | Both URLs accessible in fresh session |

**Rule:** Deployment begins no later than the start of Phase 7. If a prior phase runs long, skip decorative polish and the optional LLM; never sacrifice the working public build.

---

# 7. The copy-ready sequential AI prompts

## How to run these prompts

- Paste **Prompt 0**, then each subsequent phase into the **same coding-agent project** in Antigravity, Claude Code, Kimi Code, Cursor, etc.
- Do not start the next phase until the agent reports the requested exit gate and you verify the main interaction.
- Agent must read `/docs/PROJECT_SPEC.md` and `/docs/PHASE_LOG.md` before each phase.
- Save the exact prompts and any corrections in `/docs/PROMPT_ITERATIONS.md` for the prompt-engineering judging criterion.
- Use the same repository throughout; small incremental changes are safer than generating an entirely new app after each prompt.
- For every phase require a **finish receipt**: files changed, tests/build output, completed requirements, known limitations, next-step instruction. Do not accept "done" without a runnable result.

### PROMPT 0 — Product contract and boundaries (10 min)

```text
You are the principal engineer, product designer, and QA lead for ROUTELESS,
a 3-hour Prompt Battle project addressing the rural-student
transport challenge.

MISSION
Build a genuine, mobile-first student transport RECOVERY system, not a
map-only or bus-tracking mockup. When a bus is unavailable/full/disrupted,
students report a problem, a school coordinator confirms it, and a transparent
engine proposes assignments using VERIFIED transport resources. The
coordinator must approve. If seats are unavailable, users see honest
unserved status and a request-school-assistance fallback.

CRITICAL CONSTRAINTS
- 3 hours end-to-end, public demo and public GitHub repository required.
- Use React + Vite + TypeScript + Tailwind; localStorage demo persistence;
  Vitest; optional LLM only after full core success.
- One demo college, Village A/B/C, synthetic time 08:00, 09:00 class.
- Main showcase: B2 breaks down, 12 students affected, one eligible
  verified backup van V1 with 8 free seats. Draft = 8 assignable + 4
  unserved. Approval must not overbook or duplicate.
- Student and coordinator experiences. Role toggle is DEMO ONLY, not auth.
- No real public-bus GPS, automatic dispatch, unverified rides, payments,
  private student names, fabricated live feeds, or ML predictions.
- All demonstration data and times visibly labeled as simulated.
- A student's report must not itself authorize an operational incident.
- No empty, dead, or decorative buttons presented as functional.

WORK RULES
1. Create docs/PROJECT_SPEC.md as the single canonical description covering
   user journeys, domain objects, workflows, state transitions, and edge cases.
2. Create docs/DECISIONS.md, docs/PHASE_LOG.md, docs/PROMPT_ITERATIONS.md.
3. Define interfaces / action contracts for every later phase and a
   numbered acceptance-checklist. Keep it small enough for 3 hours.
4. Explain 3 engineering risks and how the implementation avoids them.
5. Do NOT build the UI yet. Do not spend time researching unrelated options.

EXIT GATE
Output the spec paths, exact agreed scope, scenario math, and a brief
Phase 1 implementation checklist. Stop; do not proceed to Phase 1.
```

### PROMPT 1 — Working scaffold, seeded state and persistence (20 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 1.

GOAL: A running mobile-first React app with an actual typed domain model,
deterministic seeded scenario, and reload-safe demo state.

IMPLEMENT
- Create Vite + React + TypeScript with Tailwind and lucide-react.
- Add minimal shared header/nav and Student / Coordinator route tabs.
- Implement TypeScript types for Village, Student, TransportOption,
  Incident, HelpRequest, Assignment, and action types.
- Seed one fictional college, three fictional villages, regular buses
  B1/B2 and one verified V1 van, 12 pseudonymous Village C requests.
- Set the DEMO clock to 08:00 local scenario time and class to 09:00.
- B2 initially has a reported/unconfirmed breakdown; only coordinator
  confirmation activates it. Set V1 free capacity to exactly eight.
- Create a single app reducer/store; support localStorage read/write,
  schema version, safe reset, scenario switching, and corrupted-storage
  fallback. Use stable IDs so refresh does not duplicate records.
- Display a prominent DEMO DATA badge and Reset Demo button.
- Add a /docs description of how to run and build locally.

ACCEPTANCE
- npm install and npm run dev work.
- npm run build passes with zero TypeScript errors.
- Refresh preserves active demo state.
- Reset restores identical deterministic data.
- Navigation between Student and Coordinator works.
- No dead controls or unrelated integrations.

FINISH RECEIPT
List files changed; commands run with results; demonstrate persistence;
write PHASE_LOG.md and STOP. Do not start Phase 2.
```

### PROMPT 2 — Student journey that really changes state (25 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 2.
Preserve everything working from Phase 1.

GOAL: A student can understand their commute in seconds and report a
real state change, not just open a modal.

BUILD STUDENT VIEW
- Big 'Will I reach class?' summary, with DEMO status / schedule-time labels.
- Select Village A/B/C and a demo student profile (pseudonyms only).
- Show assigned regular bus, time, and any verified incident warning.
- One-tap report choices: Not arrived, Full, Delayed, Breakdown, Blocked.
- Reporting creates or updates a HelpRequest and Incident signal with
  stable IDs; prevent duplicates on repeated clicks.
- Show 'Report received in this demo; awaiting coordinator review',
  rather than claiming a government or school has been notified.
- Show simple request lifecycle: pending review -> pending rescue ->
  proposed/confirmed/unserved. Wire to central store, no static-only UI.
- Offer 'Request school assistance' only when a request is unserved.
- Mobile first: large touch targets, clear waiting and error states.

TEST MANUALLY
- Reporting once creates exactly one request.
- Reporting twice cannot inflate 12 affected to 13 for same student.
- Refresh keeps report and status.
- Student cannot confirm incidents or approve vehicles.

FINISH RECEIPT
Report completed interactions, state mutations, build result, known
limitations; update PHASE_LOG.md and STOP.
```

### PROMPT 3 — Coordinator operations, verification and capacity (25 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 3.

GOAL: The coordinator can see meaningful student demand and verify
operational information before proposing transport recovery.

BUILD COORDINATOR DASHBOARD
- Overview cards derived from state: reported signals, confirmed
  incidents, affected requests, confirmed placements, unserved requests.
- Incident queue with Confirm / Dismiss. Student reports start unverified.
- View all impacted requests grouped by village and bus. Deduplicate.
- Vehicle inventory showing VERIFIED / UNVERIFIED, village coverage,
  depart time, schedule ETA, capacity, occupied and free seats.
- Coordinator can mark vehicle active/delayed/cancelled and edit
  demo-only occupied-seat value within valid 0..capacity limits.
- Add a clearly labeled 'Run recovery analysis' placeholder action to
  be implemented in Phase 4; do not simulate fixed results yet.
- Provide scenario selector with Breakdown, Overcrowding, Road blocked,
  No backup; loading scenario resets state intentionally and clearly.
- Confirming a breakdown must make affected requests eligible for
  planning; dismissing must prevent inappropriate rescue allocation.

GUARDRAILS
- Student view contains no coordinator-only controls.
- 'Coordinator mode' is only a demo role switch, not authorization.
- No screen invents real data or claims it dispatched a vehicle.

ACCEPTANCE
- Coordinator confirms B2 breakdown, dashboard accurately reports 12
  affected Village C requests.
- Capacity edits reflect in dashboard after reload.
- No negative or above-capacity seat counts.
- npm run build passes.

FINISH RECEIPT
List behavior confirmed, commands, files, unresolved items; write log;
STOP before Phase 4.
```

### PROMPT 4 — The Recovery Engine and safety invariants (35 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 4.
This is the PRODUCT CORE. Prefer correct algorithms to decorative UI.

GOAL: A tested, deterministic allocation heuristic, approval action,
and honest unserved classification, operating on real app state.

ENGINE RULES
1. Input only unique active HelpRequests for CONFIRMED incidents.
2. Filter options to verified, active, route-compatible vehicles not
   disrupted or blocked; also enforce accessibility where configured.
3. Compute available seats = capacity - occupiedSeats - EXISTING
   confirmed rescue assignments. Never count draft proposals as booked.
4. Require configured ETA before student's class deadline (zero grace
   for exam demo; configurable small grace for regular class).
5. Prioritize deadline urgency and fewer feasible alternatives; apply
   fair round-robin across equally prioritized villages; deterministic
   stable tie-breaking so identical input yields identical result.
6. Greedily allocate each student to the best eligible remaining option,
   decrementing temporary planning seats. Do not claim global optimality.
7. Return draft proposed assignments and explicit unserved reason codes:
   no_verified_vehicle | incompatible_route | too_late | no_capacity.
8. Explain each recommendation with village, vehicle, ETA and capacity.
9. Coordinator approval must revalidate against current canonical state,
   reject stale/unsafe plans, avoid duplicate student assignments and
   ensure no vehicle capacity exceeds its limit.
10. Cancellation releases the seat; rerunning analysis remains safe.
11. Students awaiting approval are NOT labeled as confirmed passengers.

INTEGRATE
- 'Run recovery analysis' computes and renders a proposed draft.
- Coordinator sees draft assignment rows and unserved explanation.
- 'Approve plan' actually confirms assignments in reducer after checks.
- 'Reject' discards draft without changing seats.
- Student status uses confirmed assignments from the same store.
- Derived dashboard metrics update immediately.

WRITE VITEST TESTS
A. 12 Village C requests + verified V1 8 seats -> 8 proposed, 4 unserved.
B. Zero backup -> 0 proposed, 12 unserved.
C. Vehicle unverified -> 0 proposed to that vehicle.
D. Vehicle route excludes Village C -> no assignments to it.
E. ETA later than exam start -> ineligible.
F. Two incidents share one van -> total proposed <= available seats.
G. Approve twice / rerun -> no duplicates or overbooking.
H. Cancel one confirmed assignment -> one seat becomes available.
I. Unconfirmed incident -> cannot allocate.
J. Identical input -> identical output.

EXIT GATE
npm run test AND npm run build pass. Show exact engine output for
scenario A and B. Update phase log with tests and STOP.
```

### PROMPT 5 — Complete student-to-coordinator closed loop (20 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 5.

GOAL: End-to-end behavior works without contradictions or hard-coded
outcomes. Every student status follows the approved plan in canonical state.

TASKS
- Connect reporting -> coordinator confirmation -> recovery analysis ->
  coordinator approval -> student sees pickup/status -> unserved escalation.
- Student confirmed status shows ONLY configured demo pickup instructions,
  vehicle label and schedule time. Use 'estimated / simulated' wording.
- Add unserved panel with plain-English reason and 'Request school
  assistance' action; the action must set escalated status locally and
  must NOT claim that a real school was contacted.
- Implement distinct scenario fixtures: breakdown, overcrowding,
  road-blocked corridor, no-backup. No hard-coded 8/4 text in UI.
- Give offline and storage-unavailable messages honest semantics:
  local-only demo state; no false remote-send or notification claims.
- Verify 12->8+4 when V1 available; 12->0+12 with no backup;
  confirm/edit/replan flow does not overbook; dismissal removes
  eligibility; refresh preserves assignments.
- Never suggest an unverified vehicle under any condition.
- Fix all logic errors uncovered during acceptance checks.

FINISH RECEIPT
Document the full click-by-click workflow with observed numbers,
run tests and build, update PHASE_LOG.md, STOP.
```

### PROMPT 6 — Design, explainability, and judge-ready evidence (15 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 6.

GOAL: High-quality product presentation without disturbing core logic.

DESIGN
- Clear approachable palette: deep teal, warm off-white, amber warnings,
  red only for disrupted/unserved, green for confirmed availability.
- Mobile student home: one strong primary action, simple three-step
  statuses, large legible text, responsive cards, optional low-data mode.
- Coordinator: useful operational density; compact filters and capacity
  counts; clear 'proposed vs approved' distinction; no fake graphs.
- Empty, error, success, and unserved states must look finished.
- Add 'Why this recommendation?' panel with the actual rule-based reason.
- All times and transport data visibly marked DEMO / CONFIGURED, not live.
- Improve accessibility: semantic buttons, keyboard focus, aria labels,
  accessible contrast, loading/disabled states.

JUDGING ARTIFACTS
- Write docs/DEMO_SCRIPT.md with a 90-second and a 3-minute script.
- Write docs/PROMPT_ITERATIONS.md entries describing phase prompts,
  revisions, bugs discovered and fixes; do not fabricate history.
- Add README architecture diagram and a candid limits/next-steps note.
- Add a short paragraph explaining that the Recovery Engine is a tested
  deterministic constraint heuristic, not a trained ML model.

ACCEPTANCE
No broken responsive layout at 375px width; tests/build remain green.
Document remaining technical debt and STOP.
```

### PROMPT 7 — Hard QA, public deployment, and submission (30 min)

```text
Read docs/PROJECT_SPEC.md and docs/PHASE_LOG.md. Implement ONLY Phase 7.
STOP adding features. Your responsibility is to ship a verifiable demo.

1. Run npm install (if needed), npm run test, npm run build; fix failures.
2. Manually check these paths in dev and deployed preview:
   - student reports, coordinator confirms, recovery proposes, approves,
     student observes the result; refresh persists state
   - twelve affected -> eight possible -> four unserved
   - no-backup yields zero assignments and honest escalation
   - double-approval never overbooks, unverified options excluded
   - mobile viewport, navigation, no console crashes
3. Add README with problem, product, architecture, setup commands,
   screenshots only if actually captured, test instructions, demo data
   disclaimer, limitations, and evaluation walkthrough.
4. Confirm .gitignore excludes .env, secrets and build artifacts.
5. Commit/push to a PUBLIC GitHub repository if credentials are provided
   and permission exists; otherwise provide exact steps for the human.
6. Deploy PUBLIC static site to Vercel or Cloudflare Pages (pick one).
   Ensure build command `npm run build` and output directory `dist`.
7. Verify the resulting URL from a NEW browser/incognito session, not
   just localhost or authenticated preview; verify GitHub is PUBLIC.
8. Write docs/SUBMISSION_CHECKLIST.md with exact URLs only after
   verifying them; never invent URLs or claim a deployment succeeded.

EXIT GATE
Return test and build outputs, actual verified public link(s), any
human-only steps remaining, and known non-blocking limitations.
Update PHASE_LOG.md. STOP. This is the final hackathon submission state.
```

---

# 8. Optional real-LLM extension (only if Phase 7 shipped early)

This is **not necessary to have a working product**, but adds genuine model usage inside the product rather than just using AI coding tools. Do it only after deployment is confirmed.

### PROMPT 8 — Multilingual AI incident triage (stretch)

```text
Read docs/PROJECT_SPEC.md. First verify that the complete deployed demo
still works and npm test/build pass. Implement a strictly optional
server-side AI incident interpreter, with non-AI fallback.

USE CASE
A student or coordinator types: 'Bus B2 has stopped because the bridge
is flooded near Village C' or equivalent local-language text. The model
MAY suggest {incidentType, affectedCorridorId, urgency, shortSummary,
confidence, needsCoordinatorReview}. A human must review/confirm.

RULES
- Build a server-only `/api/triage` endpoint (Vercel function) using
  an environment variable GEMINI_API_KEY; NEVER use VITE_GEMINI_API_KEY
  or expose secrets in client code. Use current Google GenAI SDK and
  structured JSON schema. Validate input/output with Zod.
- Strip or reject names, telephone numbers and detailed locations before
  sending; cap input length and rate-limit where feasible.
- Never let LLM output invent vehicles, seat counts, authorization,
  dispatch, route geometry or confirmed assignments.
- Show 'AI suggested' until a coordinator confirms any incident.
- If API key is missing, rate limited or offline, deterministic keyword
  triage should return a clearly labeled RULE-BASED SUGGESTION, not fake AI.
- Do not store any free-text input about real minors in public demo data.
- Maintain the old full functional flow and ensure builds/tests pass.

EXIT GATE
Show successful AI response only if the API truly executed; otherwise
show honest fallback. Recheck public deployment and do not disrupt it.
```

**Rationale:** An LLM is useful for classifying inconsistent natural-language incident reports, especially where formal bus incident feeds are absent; deterministic logic must still validate safety and seats. Official Gemini structured output supports schema-constrained extraction, but application-level value validation is still required.

---

# 9. Rescue prompts when the coding agent gets stuck

## Debug / regression prompt

```text
You are repairing ROUTELESS, not rebuilding it. Read PROJECT_SPEC and
PHASE_LOG. The last working phase is [PHASE]. Observed failure:
[PASTE ACTUAL ERROR OR INCORRECT BEHAVIOR].

Find the smallest root cause, identify the state transition or invariant
violated, fix it without rewriting unrelated modules, and add a regression
test. Run tests and build. Report the exact changed files and evidence.
Do not add features, change the product scope, or proceed to next phase.
```

## Scope-recovery prompt

```text
The current implementation is drifting from the approved 3-hour scope.
Compare the repository with docs/PROJECT_SPEC.md. Identify any fake data
presented as live, dead buttons, invented seat allocations, duplicated
business logic, unsecured secrets, or features delaying public deployment.

Remove or disable only those nonessential elements while keeping working
functionality intact. Prioritize the student -> incident -> coordinator ->
recovery -> approval -> student loop. Re-run tests/build. Explain changes.
```

## 10-minute emergency submission prompt

```text
Stop all new development. Make the currently implemented ROUTELESS app
build reliably. Verify the main demo scenario, write a minimal README,
check that no secrets are committed, and prepare a public deployment
using the existing repository. Report only verified commands and links.
If a feature is unfinished, disable its control rather than presenting
a fake working feature. Do not claim production readiness.
```

---

# 10. Feasibility and uniqueness analysis

## Why students might actually use it

1. One-tap action when bus is absent; no need to figure out route algorithms.
2. Clear status and safe pickup details (once a school has verified them).
3. Visibility when all seats are gone, rather than silently missing class.

## Why schools might actually use it

1. One view of transport shortages by village and class deadline.
2. An explainable draft for using existing approved capacity.
3. A record of repeatedly unserved villages that can justify extra routes or resource requests.

## What the product does **not** solve on its own

- It cannot conjure buses, make an unsafe road safe, guarantee on-time arrival, or create an official government reservation.
- It requires school/operator partners to verify vehicles and approve actions.
- Real deployment would require authentication, role-based permissions, consent/minor safeguarding, reliable schedules, operational terms and audit trails.

## Reality check against existing products

Do **not** pitch ROUTELESS as the world's first transport coordination or route-optimization app. Existing products already cover parts of this space:

| Publicly described product | Existing capability | Narrow ROUTELESS differentiation for this challenge |
|---|---|---|
| **Chalo** (https://chalo.com/chalo-app) | Live bus position, arrival estimates, passes and tickets in supported cities | Does not rely on live vehicle telematics; explicitly handles a **failed rural student journey** and a school-approved recovery plan |
| **TrackSchoolBus** (https://www.trackschoolbus.com/features; https://www.trackschoolbus.com/users) | School bus tracking, automatic routing, vehicle management, and even instant pickup assignments | Focus on **students who depend on public buses outside an existing managed school fleet**, with scarce cross-resource seats, explainable fairness, and unserved escalation |
| **Skolbuzz** (https://skolbuzz.com/) | School-bus GPS and parent boarding notifications | Response to transport failure without installing a GPS device in every government bus |

**Competitive claim:** The separate underlying features are *not novel by themselves*. The opportunity is a tight, useful combination for a poorly served context: detect unmet travel demand, use *existing verified* capacity, explicitly handle who remains unserved, and make participation possible without a live bus feed. This differentiation is a proposed product positioning, not proof of a market gap.

## Differentiation from typical hackathon builds

| Typical entry | ROUTELESS difference |
|---|---|
| A map of routes | Actionable recovery after the planned route fails |
| Fake live GPS tracking | Honest configured schedules; confidence/verification labels |
| Generic chatbot advice | Deterministic constrained assignment to verified capacity |
| Crowdsourced unknown carpools | Authorized school-controlled inventory only |
| Always 'found a solution' | Zero-seat case produces an honest unserved escalation |
| Dashboard-only analytics | Full two-sided workflow with approval and student result |

**Claim carefully:** The combination of failed-commute recovery, constrained verified-seat allocation, and school escalation is a meaningful design differentiation. We have **not** established globally that no similar product exists.

## Viability snapshot (design assessment, not external market validation)

| Dimension | Judgment | Reason |
|---|---|---|
| 3-hour demo feasibility | HIGH | Self-contained data, small domain, deterministic engine |
| Student usability | HIGH if school participates | Two-tap incident report and actionable status |
| Coordinator value | MEDIUM–HIGH potential | Requires accurate verified resource inventory |
| Operational scalability | MEDIUM | Real feeds, consent, roles, institutional partnership needed |
| Uniqueness | MODERATE–HIGH as a prototype | Recovery and transparent shortages, not generic route search |
| Safety of demo scope | HIGH if constraints honored | No unknown driver matching, minor data or fake live dispatch |
| AI credibility | HIGH for AI-assisted development; conditional for in-product AI | Engine is rules/heuristic; optional LLM is genuine if API actually used |

## What comes after the hackathon, if pilot demand exists

1. Partner with **one** institution and its authorized transport manager; import real vetted vehicles, stops, class times and capacities.
2. Add student verification or school-issued IDs, coordinator login, database access rules, cancellation/booking concurrency, and an audit log.
3. Run a 2–4 week opt-in pilot; measure *confirmed unserved students*, average response time, reassignment success, repeated village exclusion, false report rates, and coordinator workload.
4. Only then consider operator schedule imports, lightweight offline reporting, local-language support, school messaging, prediction from historical ridership, and actual route optimization.

---

# 11. Submission-ready final checklist

- [ ] Responsive public URL loads in an incognito browser.
- [ ] GitHub repo is public, source committed, no private keys.
- [ ] First screen explains the problem and shows **DEMO DATA** clearly.
- [ ] Student's one-tap report updates state.
- [ ] Coordinator can verify but student cannot approve.
- [ ] Recovery results are calculated, not fixed decorative text.
- [ ] With V1 8 available seats: 12 impacted -> 8 draft, 4 unserved.
- [ ] With no backup: 0 draft, 12 unserved.
- [ ] Approval never causes overbooking or duplicates.
- [ ] Unverified vehicles are never suggested.
- [ ] School escalation works as an in-app demo state, not fake SMS.
- [ ] Refresh preserves the scenario.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] README and demo script exist.
- [ ] Actual prompt iterations and debugging are logged honestly.
- [ ] Both final URLs were *actually opened and verified*.

**Closing pitch:** “Most transport apps tell students where a bus is supposed to be. ROUTELESS helps a school answer what to do when that bus never arrives. It detects unmet demand, makes explainable use of verified spare seats, and tells the truth when the remaining students need direct institutional help.”

---

# 12. Background references and implementation documentation

- Official uploaded Prompt Battle challenge brief, `PromptBattle_Aerophilia2K26.pdf`.
- NITI Aayog, *Daily Bus Service for Students*, Yavatmal / Zari Jamni: https://www.niti.gov.in/node/1789
- Firebase, Firestore transactions and atomic writes (relevant to a later real-time pilot): https://firebase.google.com/docs/firestore/manage-data/transactions
- Firebase, authentication and security rules: https://firebase.google.com/docs/rules/rules-and-auth
- Google AI for Developers, Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Vite, deploy a static site: https://vite.dev/guide/static-deploy.html
- OpenStreetMap Foundation, tile usage policy (explains why no offline tile-scraping shortcut): https://operations.osmfoundation.org/policies/tiles/
- Chalo app product features (live bus tracking/ticketing): https://chalo.com/chalo-app
- TrackSchoolBus feature and user capabilities (including route optimization/pickups): https://www.trackschoolbus.com/features
- Skolbuzz school-bus tracking: https://skolbuzz.com/

**Last important rule:** A fully working, honest 3-hour recovery demo is a stronger submission than a broad app with unusable maps, invented real-time data, AI-generated safety recommendations, and unfinished deployment.
