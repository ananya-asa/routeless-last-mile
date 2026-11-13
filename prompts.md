# ROUTELESS — Prompt Battle Prompt Log
## Aerophilia 2K26 | Team Prompt Iterations

---

### Prompt 1 — Initial Approach Exploration

**Goal:** Help rural students reach college when government buses are limited, cancelled, or full.

**Context:** Many students, few buses, routes sometimes disrupted. We have 3 hours and the app must be deployed and publicly accessible. We are using sample data. A surprise requirement may come later, so the design must be easy to change.

**Constraints:** Free tools only. Web app. Modular — each feature in its own file, data in a separate config file, no hardcoded values. Keep it simple enough to finish in 3 hours.

**Task:** Do not write code yet. First:
- Give 3 different approaches (what it does, build difficulty, one risk).
- Recommend one and say why.
- For the recommended approach, give the module list and what each module does, and say which modules would change if requirements change.

**Output:** Short and structured. No code.

---

### Prompt 2 — Idea Synthesis and Final Product Direction

We have two product ideas to merge into one:

**Idea A — ROUTELESS (from the official brief):**
A mobile-first arrival-recovery network. When a bus fails, students report the problem in one tap. A school coordinator confirms the incident. A deterministic Recovery Engine proposes assignments using verified school vehicles only. The coordinator approves the plan. Students who cannot be assigned see an honest "unserved" state with a school escalation option. The main showcase: Bus B2 breaks down, 12 students are affected, backup van V1 has 8 free seats — 8 assigned, 4 unserved. With zero backup — 0 assigned, 12 unserved. All data is clearly labeled as simulated.

**Idea B — BusSaathi (our addition):**
A student-first platform that adds: relay route alternatives (config-driven junction hops), a crowding forecast chip (Green / Amber / Red based on pending request count), a disruption simulation button, and a Kannada-language one-tap report so rural students can type in their local language (e.g., "Naale bus illa, college hogbeku") and have it parsed into a structured incident.

**Task:** Merge the best of both ideas. Keep ROUTELESS's coordinator-approval architecture and safety guardrails (no unknown driver matching, verified vehicles only). Add BusSaathi's personality: Kannada input, relay route, crowding chip, and disruption simulation. Drop anything that cannot be built in 3 hours or requires real data (no ML demand prediction, no villager ride-pooling, no SMS delivery claims).

Output the final merged product specification — short, structured, with feature priority (Must / Should / Stretch), data model, Recovery Engine rules, and a 90-second judge demo script.

---

### Prompt 3 — Modular Architecture Design

**Context:** We are building ROUTELESS as a React + Vite + TypeScript + Tailwind web app. Do not write code yet.

**Task:** Design the modular architecture using a strict layered approach:
- `data/` — pure data, no logic (types, fixtures, scenarios)
- `domain/` — pure TypeScript functions, no React (recoveryEngine, eligibility, metrics)
- `state/` — one canonical store using React Context + useReducer (reducer, store, persistence)
- `components/` — dumb reusable UI only, no business logic
- `pages/` — two screens: StudentHome and CoordinatorDashboard

For each module, state what it does and which files change when a specific requirement changes. Show how modules communicate — through the store only, never directly.

**Golden rule:** Domain logic never imports React. UI never contains business logic. Data files contain no functions.

---

### Prompt 4 — Tech Stack Confirmation

**Task:** Confirm the final tech stack for ROUTELESS given these constraints: free tools only, web app (not React Native), deployable as a public URL in under 3 hours, mobile-first at 375px.

Provide the stack in layers: framework, styling, state management, persistence, testing, and deployment. For each tool, give one clear reason why it was chosen. Also list what was deliberately excluded and why.

---

### Prompt 5 — Parallel Work Division for 4 Team Members

**Context:** We have 4 team members and 3 hours. The architecture is already defined (layered modular structure). The tech stack is React + Vite + TypeScript + Tailwind + Vitest + Vercel.

**Task:** Divide the work so all 4 people can work in parallel with minimal blocking. The first 10 minutes are spent together defining `types.ts`. After that, all 4 work independently. Define:
- What each person owns (files and responsibilities)
- How to unblock parallelism from minute 10
- When to wire everything together (integration point at minute 90)
- The rule for avoiding merge conflicts — no cross-module imports until integration

Provide a visual timeline showing parallel tracks and the integration window.

---

### Prompt 6 —
