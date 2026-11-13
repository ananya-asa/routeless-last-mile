// ============================================================
// recovery.ts — Person 2 recovery API.
// POST /api/recovery/run     → deterministic draft plan (no seats held)
// POST /api/recovery/approve → atomic re-check + confirmed assignments
// ============================================================

import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { db } from '../db/client.js';
import {
  approveProposals,
  planRecovery,
  type ApprovalProposalInput,
  type ApprovalResult,
  type RecoveryResult,
} from '../domain/recoveryEngine.js';
import { DEMO_NOW_MIN, loadEngineInput } from './recoveryData.js';
import { broadcast } from './events.js';

export const recoveryRoutes = new Hono();

interface ApproveBody {
  proposals?: unknown;
}

function isProposalInput(value: unknown): value is ApprovalProposalInput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.requestId === 'string' &&
    candidate.requestId.length > 0 &&
    typeof candidate.transportOptionId === 'string' &&
    candidate.transportOptionId.length > 0 &&
    (candidate.explanation === undefined || typeof candidate.explanation === 'string')
  );
}

function readProposals(body: ApproveBody): ApprovalProposalInput[] | null {
  if (!Array.isArray(body.proposals)) return null;
  const proposals: ApprovalProposalInput[] = [];
  for (const item of body.proposals) {
    if (!isProposalInput(item)) return null;
    proposals.push({
      requestId: item.requestId,
      transportOptionId: item.transportOptionId,
      explanation: item.explanation,
    });
  }
  return proposals;
}

function toDraftPlan(result: RecoveryResult) {
  return {
    id: `PLAN-${uuid().slice(0, 8).toUpperCase()}`,
    createdAtMin: DEMO_NOW_MIN,
    status: 'draft' as const,
    proposals: result.proposals.map((proposal) => ({
      id: `ASG-${proposal.requestId}`,
      requestId: proposal.requestId,
      studentId: proposal.studentId,
      isExamDay: proposal.isExamDay,
      transportOptionId: proposal.transportOptionId,
      transportLabel: proposal.transportLabel,
      status: 'proposed' as const,
      explanation: proposal.explanation,
      arrivalMin: proposal.arrivalMin,
    })),
    unserved: result.unserved,
    engineNote: `${result.affectedCount} affected · ${result.proposedCount} proposed · ${result.unservedCount} unserved. Draft seats are not reserved.`,
    // Extra counters are harmless for the UI and useful for tests/debugging.
    affectedCount: result.affectedCount,
    proposedCount: result.proposedCount,
    unservedCount: result.unservedCount,
    examStudentCount: result.examStudentCount,
  };
}

// ── POST /api/recovery/run ───────────────────────────────────
// Runs one deterministic pass. Draft proposals never consume seats.
recoveryRoutes.post('/run', (c) => {
  const input = loadEngineInput();
  const result = planRecovery(input);
  return c.json(toDraftPlan(result));
});

// ── POST /api/recovery/approve ───────────────────────────────
// The whole plan is validated and written inside one SQLite
// transaction. One conflict rejects every proposal (all-or-nothing).
recoveryRoutes.post('/approve', async (c) => {
  let body: ApproveBody;
  try {
    body = (await c.req.json()) as ApproveBody;
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const proposals = readProposals(body);
  if (!proposals) {
    return c.json({ ok: false, error: 'Body must contain a proposals array.' }, 400);
  }
  if (proposals.length === 0) {
    return c.json({ ok: false, error: 'No proposals supplied.' }, 400);
  }

  const upsertAssignment = db.prepare(`
    INSERT INTO assignments (id, request_id, transport_option_id, status, explanation)
    VALUES (?, ?, ?, 'confirmed', ?)
    ON CONFLICT(request_id) DO UPDATE SET
      transport_option_id = excluded.transport_option_id,
      status = 'confirmed',
      explanation = excluded.explanation
  `);

  const confirmRequest = db.prepare(`
    UPDATE help_requests SET status = 'confirmed' WHERE id = ?
  `);

  const markUnserved = db.prepare(`
    UPDATE help_requests
    SET status = 'unserved'
    WHERE id = ? AND status IN ('pending', 'proposed', 'unserved')
  `);

  const outcome = db.transaction(() => {
    // Re-read inside the transaction so capacity/status cannot go stale.
    const fresh = loadEngineInput();
    const checked: ApprovalResult = approveProposals(proposals, fresh);
    if (!checked.ok) {
      return { ok: false as const, result: checked };
    }

    const plan = planRecovery(fresh);

    for (const assignment of checked.assignments) {
      upsertAssignment.run(
        assignment.id,
        assignment.requestId,
        assignment.transportOptionId,
        assignment.explanation ?? null,
      );
      confirmRequest.run(assignment.requestId);
    }

    // Requests the engine proved cannot be served are recorded honestly.
    // Confirmed requests are never overwritten because they are not in plan.unserved.
    for (const entry of plan.unserved) {
      markUnserved.run(entry.requestId);
    }

    return { ok: true as const, result: checked, plan };
  })();

  if (!outcome.ok) {
    return c.json(
      {
        ok: false,
        reason: outcome.result.reason,
        message: outcome.result.message,
        conflicts: outcome.result.conflicts,
      },
      409,
    );
  }

  const count = outcome.result.assignments.length;
  const unservedCount = outcome.plan.unserved.length;

  broadcast({
    type: 'assignments_updated',
    action: 'plan_approved',
    count,
    unservedCount,
  });

  return c.json({
    ok: true,
    message: outcome.result.message,
    count,
    unservedCount,
    examStudentCount: outcome.plan.examStudentCount,
    assignments: outcome.result.assignments,
    plan: {
      id: `PLAN-${uuid().slice(0, 8).toUpperCase()}`,
      createdAtMin: DEMO_NOW_MIN,
      status: 'approved' as const,
      proposals: outcome.result.assignments,
      unserved: outcome.plan.unserved,
      examStudentCount: outcome.plan.examStudentCount,
      engineNote: `${count} confirmed · ${unservedCount} unserved.`,
    },
  });
});
