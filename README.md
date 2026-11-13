# ROUTELESS — Rural Student Arrival Assurance Network

> **Prompt Battle | Aerophilia 2K26**
> *When the bus fails, the journey shouldn't end.*

A mobile-first arrival recovery platform helping students and school transport coordinators respond to missing, delayed, full, or disrupted buses using verified backup transport capacity and transparent allocation.

---

## 🛠️ Architecture

- **Backend**: Node.js + Hono + SQLite (`better-sqlite3`) + SSE real-time updates + Docker container
- **Frontend**: React + Vite + TypeScript + Tailwind CSS

---

## 🚀 Quickstart

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker compose up --build
```

---

## 🔌 Backend API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/api/villages` | Villages + corridor ids |
| `GET` | `/api/transport` | Vehicle inventory, routes, blocked corridors |
| `PATCH` | `/api/transport/:id` | Coordinator seat/status correction |
| `GET` | `/api/incidents` | Reports + confirmed disruptions |
| `POST` | `/api/incidents` | Student/coordinator incident report |
| `PATCH` | `/api/incidents/:id` | Confirm or dismiss an incident |
| `GET` | `/api/requests` | Help requests + confirmed assignment |
| `POST` | `/api/requests` | Create a help request |
| `PATCH` | `/api/requests/:id/escalate` | Request school assistance |
| `POST` | `/api/recovery/run` | Deterministic draft plan (no seats held) |
| `POST` | `/api/recovery/approve` | Atomic capacity re-check + confirm assignments |
| `GET` | `/api/metrics` | Derived dashboard metrics |
| `GET` | `/api/events` | SSE stream for live updates |
| `GET` | `/api/scenarios` | Demo scenario presets |
| `POST` | `/api/scenarios/reset/:id` | Reset transactional demo state |

### Demo flow (Village C / Bus B2)

```bash
# 1. Coordinator confirms the reported breakdown
curl -X PATCH http://localhost:3000/api/incidents/INC-B2-BREAKDOWN \
  -H "Content-Type: application/json" -d '{"status":"confirmed"}'

# 2. Run the engine: 12 affected, 8 proposed on Van V1, 4 unserved
curl -X POST http://localhost:3000/api/recovery/run

# 3. Approve every proposal returned by /run (all-or-nothing)
#    Body: {"proposals":[{"requestId":"REQ-001","transportOptionId":"VAN-V1"}, ...]}
curl -X POST http://localhost:3000/api/recovery/approve \
  -H "Content-Type: application/json" -d @plan.json

# 4. Derived metrics (Van V1 usage reaches 10/10)
curl http://localhost:3000/api/metrics
```

> Draft proposals never consume seats. Approval re-checks capacity, incident status, eligibility, and duplicates inside one SQLite transaction; one conflict rejects the whole plan.

### Node 24 note

`better-sqlite3` may need native build tools on Node 24. For unit tests (which are DB-free):

```bash
cd backend
npm install --ignore-scripts
npm test
```

