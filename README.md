# ROUTELESS — Rural Student Arrival Assurance Network

> **Aerophilia 2K26 · Prompt Battle**  
> *When the bus fails, the journey shouldn't end.*

**ROUTELESS** is a mobile-first transport recovery and coordination platform for rural students and educational institutions. When a bus is missing, delayed, overcrowded, or disrupted, students can report the issue and request assistance. School transport coordinators can verify incidents, assess verified alternative transport capacity, review a deterministic recovery plan, and approve feasible assignments without double-booking seats.

ROUTELESS focuses on **what happens when a journey fails**—not just how to find a bus.

> **Project status:** This README documents the architecture, API endpoints, and demonstration scenario supplied by the project team. It does not assert that a particular hosted deployment, live GPS feed, or external school integration has been independently verified. Demonstration scenarios should be clearly identified as simulated.

## Contents

- [The problem](#the-problem)
- [What ROUTELESS does](#what-routeless-does)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Backend API](#backend-api)
- [Demonstration walkthrough](#demonstration-walkthrough)
- [Recovery and safety guarantees](#recovery-and-safety-guarantees)
- [Real-time updates](#real-time-updates)
- [Testing](#testing)
- [Limitations and future work](#limitations-and-future-work)
- [Submission checklist](#submission-checklist)

## The problem

In rural areas, many students rely on a small number of public buses to reach school or college. If a bus breaks down, does not arrive, is full, or cannot use a road, students may have no practical way to coordinate a safe alternative. Institutions may also lack a consolidated view of affected students and spare capacity in verified vehicles.

The problem is therefore more than route discovery: it is **transport disruption recovery under limited capacity**.

## What ROUTELESS does

### For students

- View transport and disruption information made available to the application.
- Report a missing, delayed, full, or disrupted bus.
- Create a request for transport assistance.
- View request and confirmed-assignment status.
- Escalate an unserved request for school assistance.

### For coordinators

- View reported and confirmed incidents.
- Confirm or dismiss incident reports.
- Review vehicle inventory, routes, blocked corridors, and available capacity.
- Correct transport status or seat information.
- Run a deterministic recovery analysis.
- Review proposed placements and approve a plan after capacity and eligibility are revalidated.
- Monitor derived dashboard metrics and receive server-sent updates.

### Core workflow

```mermaid
flowchart TD
    A[Student reports a problem] --> B[Incident and help request]
    B --> C{Coordinator verifies incident}
    C -->|Dismissed| D[No recovery assignment]
    C -->|Confirmed| E[Recovery engine evaluates options]
    E --> F[Draft proposals and unserved requests]
    F --> G{Coordinator approves plan?}
    G -->|No| H[No seats reserved]
    G -->|Yes| I[Atomic validation and assignment]
    I --> J[Confirmed student status and updated metrics]
    F --> K[School assistance for unserved students]
```

**Important:** A proposed assignment does **not** reserve a seat. A seat is committed only when the approval transaction succeeds.

## Architecture

```mermaid
flowchart LR
    subgraph Frontend[Frontend — React / Vite / TypeScript / Tailwind CSS]
        S[Student interface]
        C[Coordinator dashboard]
    end
    subgraph Backend[Backend — Node.js / Hono]
        API[REST API]
        SSE[SSE event stream]
        ENG[Recovery engine]
    end
    DB[(SQLite via better-sqlite3)]
    S --> API
    C --> API
    API --> ENG
    API <--> DB
    ENG <--> DB
    SSE --> S
    SSE --> C
    DB --> SSE
```

The backend exposes REST endpoints for state-changing operations and **Server-Sent Events (SSE)** for pushing updates to connected clients. SQLite stores the application state, and recovery-plan approval uses a transaction to re-check constraints before assignments are confirmed.

### Repository layout

```text
ROUTELESS/
├── backend/             # Hono API, recovery logic, SQLite persistence
├── frontend/            # React + Vite + TypeScript user interface
├── docker-compose.yml   # Docker Compose entry point
└── README.md
```

This illustrates the expected top-level layout from the provided run commands; individual source filenames may differ.

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React, Vite, TypeScript | Mobile-first student and coordinator interface |
| Styling | Tailwind CSS | Responsive UI |
| Backend | Node.js, Hono | API and business logic |
| Database | SQLite with `better-sqlite3` | Persistent application state and atomic approval |
| Live updates | Server-Sent Events (SSE) | Push incident, assignment, and dashboard changes |
| Containers | Docker / Docker Compose | Container-based local execution |

## Getting started

### Prerequisites

- Node.js and npm compatible with the project dependencies.
- Docker and Docker Compose **only** if using the container workflow.
- If `better-sqlite3` needs compilation, the platform's native build toolchain.

### Option A — Run backend and frontend separately

**Terminal 1 — Backend**

```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

The API examples below use `http://localhost:3000`. The Vite terminal will print the frontend development URL. If your ports are configured differently, use the addresses printed by the running services.

### Option B — Docker Compose

From the repository root:

```bash
docker compose up --build
```

Stop containers with `Ctrl+C` or, if running detached, `docker compose down`.

### Health check

```bash
curl http://localhost:3000/health
```

A successful response indicates the backend is reachable. The exact response body depends on the implementation.

## Backend API

The following routes are based on the provided backend contract.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Backend liveness check |
| `GET` | `/api/villages` | Villages and corridor IDs |
| `GET` | `/api/transport` | Vehicle inventory, routes, blocked corridors |
| `PATCH` | `/api/transport/:id` | Coordinator correction of seat counts or vehicle status |
| `GET` | `/api/incidents` | Reported and confirmed disruptions |
| `POST` | `/api/incidents` | Submit an incident report |
| `PATCH` | `/api/incidents/:id` | Confirm or dismiss an incident |
| `GET` | `/api/requests` | Assistance requests and confirmed assignments |
| `POST` | `/api/requests` | Create a help request |
| `PATCH` | `/api/requests/:id/escalate` | Escalate for institutional assistance |
| `POST` | `/api/recovery/run` | Generate a deterministic draft plan, without holding seats |
| `POST` | `/api/recovery/approve` | Atomically validate and confirm proposed assignments |
| `GET` | `/api/metrics` | Derived dashboard metrics |
| `GET` | `/api/events` | SSE stream of application updates |
| `GET` | `/api/scenarios` | Available demonstration scenarios |
| `POST` | `/api/scenarios/reset/:id` | Transactionally reset to a selected demo scenario |

> **Authorization:** These endpoint descriptions do not by themselves establish production authentication or role enforcement. Verify and secure access before deploying the application with real student, driver, or institutional data.

## Demonstration walkthrough

### Scenario: Village C — Bus B2 breakdown

The configured showcase uses **12 affected students** in Village C. A verified backup van, **V1**, has **8 seats available** for the disrupted journey.

Expected outcome: **8 proposed assignments, 4 unserved requests**.

#### 1. Confirm the disruption

```bash
curl -X PATCH http://localhost:3000/api/incidents/INC-B2-BREAKDOWN \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```

#### 2. Run the recovery analysis

```bash
curl -X POST http://localhost:3000/api/recovery/run
```

This generates a **draft plan only**. It does not consume vehicle capacity.

#### 3. Approve the proposed assignments

Save a `plan.json` file containing the intended proposals in the API's request format. For example, each proposal uses the following keys:

```json
{
  "proposals": [
    { "requestId": "REQ-001", "transportOptionId": "VAN-V1" }
  ]
}
```

The snippet shows **one illustrative proposal**, not the complete eight-assignment plan. For the full scenario, include all eight eligible proposals returned by the recovery analysis.

```bash
curl -X POST http://localhost:3000/api/recovery/approve \
  -H "Content-Type: application/json" \
  -d @plan.json
```

Approval performs an atomic re-check of capacity, eligibility, incident status, and duplicate assignments. If any proposed assignment conflicts, the **entire submitted plan is rejected** rather than partially committed.

#### 4. Inspect metrics

```bash
curl http://localhost:3000/api/metrics
```

The supplied scenario describes van V1 reaching **10/10 total seat usage** after approving eight new placements, implying two seats were already occupied before the recovery approval.

#### 5. Explore other scenarios

```bash
curl http://localhost:3000/api/scenarios
```

Use a scenario ID returned by that endpoint:

```bash
curl -X POST http://localhost:3000/api/scenarios/reset/SCENARIO_ID
```

Resetting a scenario changes demonstration data; do not invoke it against data you intend to preserve.

## Recovery and safety guarantees

The backend's described approval flow is designed around these rules:

- **Human verification:** Reported incidents must be confirmed before being treated as verified disruptions.
- **Verified capacity:** Recovery recommendations use eligible transport capacity; unavailable or incompatible options must not be promised to students.
- **Draft versus confirmed:** Running analysis does not hold seats.
- **Atomic approval:** Approval re-checks all relevant constraints in one SQLite transaction.
- **No duplicate booking:** Duplicate or conflicting placements invalidate the submitted plan.
- **Clear unserved outcomes:** Insufficient capacity is represented honestly rather than replaced with a fabricated ride.

These are behavioral requirements described in the supplied API and workflow; confirm them against the repository's automated tests and deployment before treating them as externally verified guarantees.

## Real-time updates

`GET /api/events` provides an **SSE stream** for connected clients to receive application updates without repeated polling. SSE is suitable for live incident, request, allocation, and dashboard state changes.

**SSE does not automatically imply real-time GPS bus tracking.** A road-following map and live bus position require additional route geometry and GPS position data. They should only be described as live features after an actual location source and matching backend contract are implemented.

## Testing

### Backend unit tests

```bash
cd backend
npm test
```

### Node.js 24 / native dependency note

`better-sqlite3` may require native build tools on some Node.js 24 environments. For **database-free unit tests only**, the supplied project instructions allow:

```bash
cd backend
npm install --ignore-scripts
npm test
```

Using `--ignore-scripts` is **not** a complete backend installation if SQLite's native module still needs to be built. For a running backend, use a supported Node version and install/build the native dependency normally.

### Frontend build

```bash
cd frontend
npm run build
```

Run tests and builds locally and record the actual outputs before submission. No test-run results are claimed in this document.

## Limitations and future work

- **Demonstration versus production:** Seeded incidents, seat availability, and school processes are examples, not verified public transport feeds.
- **Real-world onboarding:** Institutions and transport operators must provide accurate vehicle information and authorize actual transport decisions.
- **Authentication and privacy:** Real student or driver data requires secure role-based access, data retention rules, and privacy safeguards.
- **Live bus map:** A route map and moving vehicle marker are a separate frontend feature and require authentic route geometry and location updates before they can be marketed as live tracking.
- **ETA accuracy:** Real-time arrival predictions require reliable vehicle position and routing/traffic assumptions.
- **Offline operation:** Server-side reporting and approval require network connectivity; cached frontend views do not imply successful delivery of reports.

## Submission checklist

- [ ] Backend starts and `/health` responds.
- [ ] Frontend builds and loads without runtime errors.
- [ ] Incident confirmation → recovery run → approval works end-to-end.
- [ ] 12 affected / 8 proposed / 4 unserved scenario is reproducible.
- [ ] Atomic approval, duplicate prevention, and zero-backup cases are tested.
- [ ] Deployment URL works from a fresh browser session.
- [ ] Public GitHub repository contains the source, documentation, and no secrets.
- [ ] Demo data, limitations, and permission boundaries are clearly explained.
- [ ] Prompt archive and actual prompt iterations are included if required for judging.

---

**ROUTELESS · Aerophilia 2K26 Prompt Battle**  
*When the bus fails, the journey shouldn't end.*
