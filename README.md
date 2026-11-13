# ROUTELESS — Rural Student Arrival Assurance Network

> **Prompt Battle | Aerophilia 2K26**
> *When the bus fails, the journey shouldn't end.*

A mobile-first arrival recovery platform helping students and school transport coordinators respond to missing, delayed, full, or disrupted buses using verified backup transport capacity and transparent seat allocation.

---

## 🏗️ Architecture

| Layer | Stack |
|---|---|
| **Backend** | Node.js · Hono · SQLite (`better-sqlite3`) · Server-Sent Events (SSE) · Docker |
| **Frontend** | React 18 · Vite · TypeScript · Tailwind CSS · Three.js (3D route scene) |
| **AI Feature** | Sarvam AI Indic Language API — Kannada natural-language triage |
| **Deployment** | Frontend → Vercel · Backend → Railway / Docker |

---

## 🚀 Quickstart (Local)

### Prerequisites
- Docker Desktop running
- Node.js 20+

### 1. Backend (via Docker — recommended)
```bash
docker compose up --build
# Backend available at http://localhost:3000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend available at http://localhost:5173
```

### 3. Environment Files

**`backend/.env`**
```env
PORT=3000
DB_PATH=./data/routeless.db
SARVAM_API_KEY=your_sarvam_key_here
FRONTEND_URL=*
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:3000
```

---

## 🔌 Backend API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/villages` | Villages + corridor IDs |
| `GET` | `/api/transport` | Vehicle inventory, routes, blocked corridors |
| `PATCH` | `/api/transport/:id` | Coordinator seat/status correction |
| `GET` | `/api/incidents` | Reports + confirmed disruptions |
| `POST` | `/api/incidents` | Student/coordinator incident report |
| `PATCH` | `/api/incidents/:id` | Confirm or dismiss an incident |
| `GET` | `/api/requests` | Help requests + confirmed assignment |
| `POST` | `/api/requests` | Create a help request |
| `PATCH` | `/api/requests/:id/escalate` | Request school assistance |
| `POST` | `/api/recovery/run` | Deterministic draft plan (seats NOT held) |
| `POST` | `/api/recovery/approve` | Atomic capacity re-check + confirm assignments |
| `GET` | `/api/metrics` | Derived dashboard metrics |
| `GET` | `/api/events` | SSE stream for live coordinator→student push |
| `GET` | `/api/scenarios` | Demo scenario presets |
| `POST` | `/api/scenarios/reset/:id` | Reset demo state to a scenario |
| `POST` | `/api/triage/sarvam` | Kannada text → structured incident (Sarvam AI) |

---

## 🎬 Demo Flow

### Default Scenario (Village C / Bus B2 Breakdown)
```bash
# 1. Confirm the reported breakdown
curl -X PATCH http://localhost:3000/api/incidents/INC-B2-BREAKDOWN \
  -H "Content-Type: application/json" -d '{"status":"confirmed"}'

# 2. Run recovery engine — 12 affected, 8 proposed on Van V1, 4 unserved
curl -X POST http://localhost:3000/api/recovery/run

# 3. Approve the plan (all-or-nothing atomic transaction)
curl -X POST http://localhost:3000/api/recovery/approve \
  -H "Content-Type: application/json" -d @plan.json

# 4. Check metrics — Van V1 usage goes to 8/8
curl http://localhost:3000/api/metrics
```

### Exam Day Crisis Scenario
```bash
curl -X POST http://localhost:3000/api/scenarios/reset/SCN-EXAM-CRISIS
# Loads: 17 students · dual B1+B2 breakdown · Southern corridor flooded
# Engine: 10 exam students → all 8 Van V1 seats · 9 unserved (honest)
```

### Kannada Triage (Sarvam AI)
```bash
curl -X POST http://localhost:3000/api/triage/sarvam \
  -H "Content-Type: application/json" \
  -d '{"text":"ನಾಳೆ 9 ಗಂಟೆಗೆ ಎಕ್ಸಾಮ್ ಇದೆ, ಬಸ್ ಬಂದಿಲ್ಲ"}'
# → { isExamDay: true, urgency: "critical", incidentType: "no_show" }
```

> **Safety guarantee:** Draft proposals never consume seats. Approval re-checks capacity, incident status, eligibility, and duplicate assignments inside a single SQLite transaction. One conflict rejects the entire plan.

---

## 🧪 Tests

```bash
cd backend
npm run test
# ✓ 13 tests passing (Vitest)
```

---

## 📁 Project Structure

```
routeless-last-mile/
├── backend/
│   ├── src/
│   │   ├── db/            # schema.sql, seed.ts, client.ts
│   │   ├── domain/        # recoveryEngine.ts, eligibility.ts, metrics.ts
│   │   ├── routes/        # incidents, requests, recovery, events, triage, ...
│   │   └── tests/         # engine.test.ts (Vitest)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/           # client.ts (all backend API calls + field mapping)
│   │   ├── components/    # DemoBadge, AssignmentCard, EmptyState, student/*
│   │   ├── pages/         # StudentHome.tsx, CoordinatorDashboard.tsx
│   │   ├── hooks/         # useSSE.ts
│   │   └── data/          # types.ts
│   └── package.json
├── docker-compose.yml
└── prompts.md             # Prompt Battle trajectory log
```

---

## 🔒 Safety Principles

- **Verified vehicles only** — no unvetted driver matching, no open carpooling
- **Honest unserved state** — never fake 100% success; show real seat math
- **Demo labeled** — `DemoBadge` present on all student-facing screens
- **Config-driven relay routes** — read from `relay_routes` DB table, never hardcoded strings
- **All-or-nothing approval** — one seat conflict rejects the entire plan

---

## 👥 Team — Aerophilia 2K26

Built at **Aerophilia 2K26 Prompt Battle** using Google Antigravity (Gemini) + Claude via Antigravity.
