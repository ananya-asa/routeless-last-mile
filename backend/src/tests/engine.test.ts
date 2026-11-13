// engine.test.ts — Vitest unit tests for allocation invariants
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/client.js';
import { runRecoveryEngine } from '../domain/recoveryEngine.js';

describe('Recovery Engine Core Invariants', () => {
  beforeEach(() => {
    // Clean tables before each test
    db.prepare('DELETE FROM assignments').run();
    db.prepare('DELETE FROM help_requests').run();
    db.prepare('DELETE FROM incident_villages').run();
    db.prepare('DELETE FROM incidents').run();
    db.prepare('DELETE FROM transport_blocked_corridors').run();

    // Default: Regular buses are active, backup Van V1 has 2 occupied of 10
    db.prepare("UPDATE transport_options SET status = 'active', occupied_seats = 0, verified = 1 WHERE id = 'BUS-B1'").run();
    db.prepare("UPDATE transport_options SET status = 'active', occupied_seats = 0, verified = 1 WHERE id = 'BUS-B2'").run();
    db.prepare("UPDATE transport_options SET status = 'active', occupied_seats = 2, verified = 1 WHERE id = 'VAN-V1'").run();
  });

  it('Test A: Bus B2 breaks down, 12 Village C requests + Van V1 (8 seats free) -> 8 proposed, 4 unserved', () => {
    // B2 is broken!
    db.prepare("UPDATE transport_options SET status = 'cancelled' WHERE id = 'BUS-B2'").run();

    const incId = 'INC-A';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-C')").run(incId);

    const insertReq = db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status) VALUES (?, ?, ?, 'pending')");
    for (let i = 1; i <= 12; i++) {
      insertReq.run(`REQ-${i}`, `STU-${i}`, incId);
    }

    const res = runRecoveryEngine();
    expect(res.affectedCount).toBe(12);
    expect(res.proposedCount).toBe(8);
    expect(res.unservedCount).toBe(4);
    expect(res.unserved[0].reason).toBe('no_capacity');
  });

  it('Test B: Zero backup scenario -> 0 proposed, 12 unserved', () => {
    // Disable all vehicles
    db.prepare("UPDATE transport_options SET status = 'cancelled'").run();

    const incId = 'INC-B';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-C')").run(incId);

    const insertReq = db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status) VALUES (?, ?, ?, 'pending')");
    for (let i = 1; i <= 12; i++) {
      insertReq.run(`REQ-${i}`, `STU-${i}`, incId);
    }

    const res = runRecoveryEngine();
    expect(res.proposedCount).toBe(0);
    expect(res.unservedCount).toBe(12);
  });

  it('Test C: Unverified vehicle -> 0 proposed to unverified option', () => {
    db.prepare("UPDATE transport_options SET status = 'cancelled' WHERE id = 'BUS-B2'").run();
    db.prepare("UPDATE transport_options SET verified = 0 WHERE id = 'VAN-V1'").run();

    const incId = 'INC-C';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-C')").run(incId);

    db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status) VALUES ('REQ-C1', 'STU-1', ?, 'pending')").run(incId);

    const res = runRecoveryEngine();
    expect(res.proposedCount).toBe(0);
    expect(res.unservedCount).toBe(1);
  });

  it('Test D: Vehicle route excludes village -> no assignments to it', () => {
    const incId = 'INC-D';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B1', 'breakdown', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-A')").run(incId);

    db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status) VALUES ('REQ-D1', 'STU-1', ?, 'pending')").run(incId);

    const res = runRecoveryEngine();
    // Van V1 only serves Village C, so it cannot serve Village A!
    expect(res.proposals.some(p => p.transportOptionId === 'VAN-V1')).toBe(false);
  });

  it('Test E: Exam Crisis: 17 students (+40% surge), 10 taking exams -> Exam students prioritized for all 8 seats', () => {
    db.prepare("UPDATE transport_options SET status = 'cancelled' WHERE id IN ('BUS-B1', 'BUS-B2')").run();

    const incId = 'INC-EXAM';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-C')").run(incId);

    const insertReq = db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status, is_exam_day) VALUES (?, ?, ?, 'pending', ?)");
    for (let i = 1; i <= 17; i++) {
      const isExam = i <= 10 ? 1 : 0;
      insertReq.run(`REQ-E-${i}`, `STU-${i}`, incId, isExam);
    }

    const res = runRecoveryEngine();
    expect(res.affectedCount).toBe(17);
    expect(res.examStudentCount).toBe(10);
    expect(res.proposedCount).toBe(8);
    // Every single proposal must belong to an exam student!
    expect(res.proposals.every(p => p.isExamDay)).toBe(true);
    expect(res.unservedCount).toBe(9);
  });

  it('Test F: Flooded Corridor -> Rejection with route_blocked and Relay Alternative to Village B', () => {
    db.prepare("UPDATE transport_options SET status = 'cancelled' WHERE id = 'BUS-B2'").run();
    db.prepare("INSERT INTO transport_blocked_corridors (transport_id, corridor_id) VALUES ('VAN-V1', 'CRD-SOUTH')").run();

    const incId = 'INC-FLOOD';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B2', 'road_block', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-C')").run(incId);

    db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status, is_exam_day) VALUES ('REQ-F1', 'STU-1', ?, 'pending', 1)").run(incId);

    const res = runRecoveryEngine();
    expect(res.proposedCount).toBe(0);
    expect(res.unserved[0].reason).toBe('route_blocked');
    expect(res.unserved[0].relayAlternative).toContain('Village B');
  });

  it('Test G: Deterministic output -> Identical input yields identical output', () => {
    const incId = 'INC-G';
    db.prepare("INSERT INTO incidents (id, transport_option_id, type, status, reported_by) VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator')").run(incId);
    db.prepare("INSERT INTO incident_villages (incident_id, village_id) VALUES (?, 'VLG-C')").run(incId);

    db.prepare("INSERT INTO help_requests (id, student_id, incident_id, status) VALUES ('REQ-G1', 'STU-1', ?, 'pending')").run(incId);

    const res1 = runRecoveryEngine();
    const res2 = runRecoveryEngine();
    expect(res1).toEqual(res2);
  });
});
