# ROUTELESS — Final Product Specification
### Rural Student Arrival Assurance Network | Prompt Battle 2026

> **Tagline:** When the bus fails, the journey shouldn't end.
> **Demo label:** All transport data, times, and allocations are **SIMULATED / DEMO** until verified operational feeds exist.

---

## 1. One-Sentence Product Definition

**ROUTELESS is a mobile-first, bilingual student transport recovery platform that turns a failed bus into a coordinator-approved backup plan — or an honest escalation when no safe seat exists.**

---

## 2. The Problem (Three Failure Cases)

| Failure | What happens to the student |
|---|---|
| **Availability** | Bus cancelled, no-show, or breakdown |
| **Capacity** | Bus is full; student left at stop |
| **Route** | Road blocked, weather, detour makes trip infeasible |

**Core insight from BusSaathi:** Students' real panic is *"I'm at the stop, the bus isn't coming. Now what?"* — not "where is the bus on a map."

---

## 3. Two Primary Users

### Student
- Needs: Is my bus running? Can I report in one tap? Is there a verified alternative? What if there's no seat?
- Language: English or Kannada (local-language input supported)

### School Transport Coordinator
- Needs: Which villages are affected? Which vehicles have free seats? What's the fair allocation plan? Who remains unserved?

> **Demo role toggle is a UI switch only — not real authentication or authorization.**

---

## 4. Feature Set

### MUST — Core Recovery Loop
1. **Student commute check** — pick village + college + class time; see bus status and schedule (labeled DEMO).
2. **One-tap problem report** — Bus absent / Full / Delayed / Breakdown / Road blocked. Supports **Kannada free-text** ("Naale bus illa, college hogbeku") parsed by AI or deterministic keyword fallback.
3. **Coordinator disruption board** — grouped incident signals, confirm or dismiss; student reports stay *unverified* until coordinator acts.
4. **Verified vehicle inventory** — government buses + school-authorized vehicles; route coverage, capacity, occupied seats, departure time.
5. **Recovery Engine** — deterministic constraint-based allocation (see §7); produces draft proposals + honest unserved reasons.
6. **Coordinator approval** — inspect draft, approve or reject; approval rechecks capacity atomically; no overbooking.
7. **Student status view** — Pending → Proposed pickup → Confirmed → Waitlisted/Unserved → School escalation requested.
8. **Scenario simulator** — Breakdown / Overcrowding / Road blocked / Zero backup; loads fresh fixture state.

### SHOULD — BusSaathi Additions (fit within 3 hours)
9. **Relay route alternative** — if primary bus is disrupted, show config-defined junction-hop alternative (purely data-driven, no routing algorithm).
10. **Crowding forecast chip** — Green / Amber / Red per bus based on pending request count vs. capacity threshold; labeled "demand signal, not live data."
11. **"Why this recommendation?" panel** — plain-English rule-based reason for every assignment and every unserved outcome.

### STRETCH — Only after public deployment confirmed
12. **Kannada/multilingual AI assistant** — server-side Gemini API endpoint; free-text → structured incident schema; coordinator confirmation required; no names/phones sent to LLM; deterministic fallback always works.

### EXPLICIT NON-GOALS
- No live GPS or real bus tracking
- No ride-pooling with unknown villagers/teachers (safety: minors)
- No ML demand prediction without training data
- No automatic vehicle dispatch or SMS/WhatsApp delivery claims
- No payment, biometrics, or precise student location
- No Firebase on day one (adds auth/rules complexity)

---

## 5. The Showcase Scenario (All Data Simulated)

```
Villages:   A, B, C  →  Demo District College
Class start: 09:00 (demo scenario time; displayed as "DEMO 08:00 → 09:00 deadline")

Buses:
  B1 — Route A+B, 07:00, 40 seats, active
  B2 — Route C,   07:30, 40 seats, BREAKDOWN (reported → coordinator confirms)

Backup:
  V1 — School-authorized van, Route C, 07:45,
       capacity 10, occupied 2 → 8 FREE SEATS, arrives 08:50 (before deadline)

Students: 12 pseudonymous requests from Village C (STU-001 … STU-012)

Expected Recovery Engine output:
  Affected:   12
  Proposed:    8  (V1 has 8 free seats, arrives before 09:00)
  Unserved:    4  (reason: no_capacity)
  Zero-backup: 0 proposed, 12 unserved (honest escalation)
```

**90-Second Judge Demo Script:**
1. Student view → Village C → "Bus not coming" (or type Kannada) → see *Reported, awaiting confirmation*
2. Coordinator view → Confirm B2 breakdown → see 12 affected
3. Run Recovery Engine → see 8 proposed + 4 unserved with reasons
4. Approve plan → V1 seats consumed; student status updates
5. 4 unserved students → "Request school assistance" (in-app only, no fake SMS)
6. Switch to Zero-backup scenario → 0 assignments, 12 unserved, no fabricated options

---

## 6. Data Model (TypeScript)

```ts
type IncidentStatus  = 'reported' | 'confirmed' | 'dismissed'
type VehicleStatus   = 'active' | 'delayed' | 'cancelled'
type RequestStatus   = 'pending' | 'proposed' | 'confirmed' | 'unserved' | 'escalated'
type IncidentType    = 'no_show' | 'full' | 'breakdown' | 'delay' | 'road_block'
type UnservedReason  = 'no_verified_vehicle' | 'incompatible_route' | 'too_late' | 'no_capacity'

Village          { id, name, corridorId }
Student          { id, villageId, institutionId, classStartMin, isExamDay,
                   previousUnservedDays, needsAccessibleVehicle? }
TransportOption  { id, label, verified, kind, status, villageIds,
                   accessible, capacity, occupiedSeats, departureMin,
                   arrivalMinByVillage, blockedCorridorIds }
Incident         { id, transportOptionId, type, status, reportedBy,
                   affectedVillageIds, details? }
HelpRequest      { id, studentId, incidentId, status, assignedOptionId? }
Assignment       { id, requestId, transportOptionId,
                   status: 'proposed'|'confirmed'|'cancelled', explanation }
```

**One canonical store. Derived metrics only. Stable IDs. No duplicates on refresh.**

---

## 7. Recovery Engine Rules (Deterministic, Not ML)

```
INPUT: active HelpRequests for CONFIRMED incidents, vehicles, class deadline

1. Deduplicate requests by student + incident
2. Only requests tied to CONFIRMED incidents enter planning
3. Exclude: disrupted, unverified, inactive vehicles
4. Require: vehicle serves student's village AND avoids blocked corridors
5. Require: accessible vehicle if student flag set
6. Require: ETA ≤ classStartMin (zero grace on exam days)
7. availableSeats = capacity − occupiedSeats − existing confirmed assignments
   (draft proposals do NOT reduce seats)
8. Priority: exam day → fewer alternatives → round-robin across villages
   Deterministic tie-break (stable sort by studentId)
9. Greedily assign; decrement planning seats per draft pass only
10. Output: proposed[], unserved[] each with reason code + explanation
11. On coordinator APPROVE: re-validate all invariants; reject stale plans
12. Cancellation releases seat; re-run remains safe

This is a constraint-based allocation heuristic, not a trained predictive model.
```

---

## 8. Metrics (Computed from State — Never Faked)

| Metric | Formula |
|---|---|
| `affected` | unique requests in confirmed disruptions |
| `eligibleProposals` | feasible draft assignments |
| `confirmedPlacements` | confirmed assignments |
| `unserved` | affected − confirmedPlacements |
| `seatUsage` | occupiedSeats + confirmed rescue assignments per vehicle |

---

## 9. Edge-Case Handling

| Edge case | Correct behavior |
|---|---|
| No vehicle available | Show unserved state + school escalation; never invent a ride |
| Demand > seats | Waitlist preserved; no overbooking ever |
| Unverified student report | Signal only; coordinator confirms operational incident |
| Vehicle claimed twice | Count seats once across all confirmed assignments |
| Van doesn't serve village | Mark ineligible even if seats are free |
| Arrival after class deadline | Do not promise on-time; show late/unserved |
| App offline | Show cached state; label "Saved on this device — not yet sent to school" |
| Minor student | Only verified institution-sanctioned vehicles; no unknown drivers |
| Repeat approval | Re-check atomically; reject if already assigned |
| Cancelled assignment | Release seat; re-plan is safe |

---

## 10. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React + Vite + TypeScript | Fast scaffold, type-safe, static deploy |
| Styling | Tailwind CSS + lucide-react | Mobile-first, icons built-in |
| State | React Context + useReducer | Single canonical store, no extra deps |
| Persistence | localStorage | No server needed for demo |
| Testing | Vitest | Fast unit tests, same toolchain |
| Deploy | Vercel (one provider only) | Free, GitHub auto-deploy, `dist` output |
| Optional AI | Vercel `/api/triage` + Gemini API | Server-side only; never expose key in client |

---

## 11. Folder Structure

```
routeless/
├── src/
│   ├── components/        # StatusChip, VehicleCard, EmptyState, Modal
│   ├── pages/             # StudentHome.tsx, CoordinatorDashboard.tsx
│   ├── data/              # types.ts, demoFixtures.ts, scenarios.ts
│   ├── domain/            # recoveryEngine.ts, eligibility.ts, metrics.ts
│   ├── state/             # reducer.ts, store.tsx, persistence.ts
│   └── tests/             # engine.test.ts, reducer.test.ts, scenarios.test.ts
├── api/                   # OPTIONAL: triage.ts (Gemini, server-side only)
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── DECISIONS.md
│   ├── PHASE_LOG.md
│   ├── PROMPT_ITERATIONS.md
│   └── DEMO_SCRIPT.md
├── README.md
└── package.json
```

---

## 12. Design Language

| Token | Value | Use |
|---|---|---|
| Primary | Deep teal `#0F766E` | Nav, CTAs, confirmed state |
| Warning | Amber `#F59E0B` | Full bus, crowding amber |
| Danger | Red `#EF4444` | Disrupted, unserved |
| Success | Green `#22C55E` | Confirmed placement |
| Background | Warm off-white `#FAFAF9` | App background |
| DEMO badge | Indigo `#6366F1` | Always visible on data |

**Mobile-first:** 375px base; large touch targets (min 48px); single primary action per screen; no fake graphs or decorative animations.

---

## 13. Required Vitest Tests

| # | Test | Expected |
|---|---|---|
| A | 12 Village C requests + V1 (8 seats) | 8 proposed, 4 unserved |
| B | Zero backup vehicles | 0 proposed, 12 unserved |
| C | Unverified vehicle | 0 assigned to it |
| D | Vehicle excludes Village C | No assignments |
| E | ETA > exam start | Ineligible |
| F | Two incidents, one van | Total ≤ available seats |
| G | Approve twice | No duplicates or overbook |
| H | Cancel one confirmed | Seat released |
| I | Unconfirmed incident | No allocation |
| J | Same input twice | Same output (deterministic) |

---

## 14. Three-Hour Execution Plan

| Phase | Box | Delivers | Exit gate |
|---|---|---|---|
| **0** Lock spec | 10 min | This document, DECISIONS.md | Fixed constraints |
| **1** Scaffold | 20 min | Vite app, types, fixtures, store, persistence, reset | `npm run dev` works; reload keeps state |
| **2** Student journey | 25 min | Village pick, status, one-tap report (+ Kannada input), request lifecycle | Report creates exactly one request; refresh keeps it |
| **3** Coordinator ops | 25 min | Incident confirm/dismiss, vehicle inventory, seat edit, relay route display | Confirm B2 → 12 affected shown |
| **4** Recovery Engine | 35 min | Algorithm, proposal/approval, all 10 Vitest tests | Tests pass; 12→8+4 and 12→0+12 correct |
| **5** Close the loop | 20 min | End-to-end status, 4 scenarios, unserved escalation, offline label | Full click path works; refresh safe |
| **6** UX + explainability | 15 min | Design tokens, Why panel, crowding chip, DEMO_SCRIPT.md | 375px mobile ok; tests green |
| **7** QA + Deploy | 30 min | Public Vercel URL, public GitHub repo, README, submission checklist | Incognito browser verifies both URLs |

> **Rule:** Deployment starts no later than Phase 7. If behind, skip polish — never skip working build.

---

## 15. Submission Checklist

- [ ] Public Vercel URL loads in incognito browser
- [ ] GitHub repo is public, no secrets committed
- [ ] First screen shows DEMO DATA label clearly
- [ ] Student one-tap report (English + Kannada) updates state
- [ ] Coordinator can confirm; student cannot approve
- [ ] Recovery Engine: 12 → 8 proposed + 4 unserved (V1 scenario)
- [ ] Recovery Engine: 12 → 0 proposed + 12 unserved (zero-backup)
- [ ] Coordinator approval never overbooks or duplicates
- [ ] Unverified vehicles never suggested
- [ ] Relay route shown as configured alternative
- [ ] Crowding chip (Green/Amber/Red) visible on bus cards
- [ ] Offline state labeled "saved on this device only"
- [ ] `npm run test` passes
- [ ] `npm run build` passes (zero TS errors)
- [ ] README + DEMO_SCRIPT.md exist
- [ ] PROMPT_ITERATIONS.md has honest log of prompts and fixes
- [ ] Both URLs opened and verified by a human

---

## 16. Closing Pitch

> *"Most transport apps tell students where the bus is supposed to be. ROUTELESS tells a school what to do when that bus never arrives — and tells the truth when no safe seat exists."*

**What makes it different:**
- Actionable recovery, not a map
- Honest unserved state, not fabricated solutions
- Verified-vehicle-only allocation (safe for minors)
- Bilingual (Kannada) one-tap reporting
- Transparent constraint math judges can verify live
