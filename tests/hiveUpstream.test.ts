import { describe, expect, it } from 'vitest';
import {
  mapUpstreamAnswerStatus,
  mapUpstreamErrorCode,
  mapUpstreamTaskRow,
  mapUpstreamTaskState
} from '../src/transport/hiveUpstream';
import phase2 from './fixtures/hive-upstream/phase2-payloads.json';
import taskRefs from './fixtures/hive-upstream/task-refs-payloads.json';

interface StopPayload {
  status?: string;
  operation_id?: string;
}
interface AnswerResult {
  hive_answer?: { status?: string; draft_kept?: boolean };
}

describe('Upstream Hive payload mapping', () => {
  it('maps every stop status captured from the server', () => {
    const stopStatuses = [
      (phase2.bee_stop.stopped as StopPayload).status,
      (phase2.bee_stop.replay as StopPayload).status,
      (phase2.bee_stop.target_stale as StopPayload).status,
      (phase2.bee_stop_unconfirmed.unconfirmed as StopPayload).status,
      (phase2.bee_stop_unconfirmed.retried as StopPayload).status
    ].filter((value): value is string => typeof value === 'string');

    expect(stopStatuses.length).toBeGreaterThan(3);
    for (const status of stopStatuses) {
      expect(mapUpstreamTaskState(status), `unmapped stop status ${status}`).not.toBeNull();
    }
    // Sanity: the interesting ones land where the domain expects.
    expect(mapUpstreamTaskState('STOPPED')).toBe('stopped');
    expect(mapUpstreamTaskState('STOPPING')).toBe('running');
    expect(mapUpstreamTaskState('TARGET_STALE')).toBe('error');
  });

  it('maps every hive_answer outcome, keeping delivery_pending retryable', () => {
    const results = Object.values(phase2.question_answers.results as Record<string, AnswerResult>)
      .map(result => result.hive_answer?.status)
      .filter((value): value is string => typeof value === 'string');

    expect(results.length).toBeGreaterThan(5);
    for (const status of results) {
      expect(mapUpstreamAnswerStatus(status), `unmapped answer status ${status}`).not.toBeNull();
    }
    expect(mapUpstreamAnswerStatus('consumed')?.ok).toBe(true);
    expect(mapUpstreamAnswerStatus('conflict')?.errorKind).toBe('conflict');
    expect(mapUpstreamAnswerStatus('closed')?.errorKind).toBe('stale');
    expect(mapUpstreamAnswerStatus('stale_generation')?.errorKind).toBe('stale');
    expect(mapUpstreamAnswerStatus('delivery_pending')?.errorKind).toBe('unavailable');
    expect(mapUpstreamAnswerStatus('invalid')?.errorKind).toBe('unknown');
  });

  it('maps server error codes onto transport error kinds', () => {
    const codes = Object.values(phase2.bee_stop.errors as Record<string, { code?: string }>)
      .map(error => error.code)
      .filter((value): value is string => typeof value === 'string');
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      expect(mapUpstreamErrorCode(code), `unmapped error code ${code}`).not.toBeNull();
    }
    expect(mapUpstreamErrorCode('UNKNOWN_METHOD')).toBe('unsupported');
    expect(mapUpstreamErrorCode('BAD_PARAMS')).toBe('unknown');
  });

  it('converts snapshot rows into domain tasks', () => {
    const before = mapUpstreamTaskRow(taskRefs.question_open.snapshot_before[0]);
    expect(before).not.toBeNull();
    expect(before?.id).toBe('<task-1>');
    expect(before?.laneId).toBe('<bee-1>');
    expect(before?.status).toBe('running');
    expect(before?.updatedAt).toBe(1700000000000);

    const waiting = mapUpstreamTaskRow(taskRefs.question_open.snapshot_waiting[0]);
    expect(waiting?.status).toBe('waiting_user');

    expect(mapUpstreamTaskRow({})).toBeNull();
    expect(mapUpstreamTaskRow({ task_ref: 't', bee_id: 'b', state: 'mystery' })).toBeNull();
  });

  it('maps the question card state onto the domain status', () => {
    expect(phase2.question_card.result.status).toBe('waiting_user');
    expect(mapUpstreamTaskState(phase2.question_card.result.status)).toBe('waiting_user');
  });
});
