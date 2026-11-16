import type { HiveTask, HiveTaskStatus } from '../domain/hive';
import type { HiveBridgeErrorKind } from './hiveBridge';

/**
 * Vocabulary bridge between the real Hive server payloads (captured under
 * `tests/fixtures/hive-upstream/`) and the web domain. Kept separate from the transport so the
 * mapping is testable without a running bridge.
 */

/** Task/run state as the server reports it (`state` on a task row, or a stop result `status`). */
export function mapUpstreamTaskState(value: string): HiveTaskStatus | null {
  switch (value.trim().toLowerCase()) {
    case 'queued':
    case 'pending':
      return 'queued';
    case 'running':
      return 'running';
    case 'waiting_user':
      return 'waiting_user';
    case 'done':
    case 'completed':
      return 'done';
    case 'stopped':
      return 'stopped';
    // A stop that has been accepted but not finished: the task is still open.
    case 'stopping':
      return 'running';
    // The task the caller named no longer exists on the server.
    case 'target_stale':
      return 'error';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return null;
  }
}

export interface UpstreamAnswerOutcome {
  ok: boolean;
  /** Present when the answer was refused; retryable kinds stay retryable. */
  errorKind?: HiveBridgeErrorKind;
}

/**
 * `hive_answer.status` from the server. `delivery_pending` is the one retryable refusal: the write
 * may have landed, so the client must not treat it as a hard failure.
 */
export function mapUpstreamAnswerStatus(value: string): UpstreamAnswerOutcome | null {
  switch (value.trim().toLowerCase()) {
    case 'consumed':
      return { ok: true };
    case 'conflict':
      return { ok: false, errorKind: 'conflict' };
    case 'closed':
      return { ok: false, errorKind: 'stale' };
    case 'stale_generation':
    case 'stale_question':
      return { ok: false, errorKind: 'stale' };
    case 'delivery_pending':
      return { ok: false, errorKind: 'unavailable' };
    case 'invalid':
      return { ok: false, errorKind: 'unknown' };
    default:
      return null;
  }
}

/** Server error codes seen on refused Hive calls. */
export function mapUpstreamErrorCode(value: string): HiveBridgeErrorKind | null {
  switch (value.trim().toUpperCase()) {
    case 'BAD_PARAMS':
      return 'unknown';
    case 'UNKNOWN_METHOD':
      return 'unsupported';
    default:
      return null;
  }
}

/** One row of the server's task snapshot. */
export interface UpstreamTaskRow {
  bee_id?: unknown;
  run_id?: unknown;
  state?: unknown;
  task_ref?: unknown;
  updated_at_ms?: unknown;
  question_open?: unknown;
  version?: unknown;
}

/**
 * Converts a server task row into the domain task the shell renders. Returns null when the row is
 * unusable (missing task ref, bee, or a state we do not know) instead of inventing values.
 */
export function mapUpstreamTaskRow(row: UpstreamTaskRow): HiveTask | null {
  const id = typeof row.task_ref === 'string' ? row.task_ref.trim() : '';
  const laneId = typeof row.bee_id === 'string' ? row.bee_id.trim() : '';
  const status = typeof row.state === 'string' ? mapUpstreamTaskState(row.state) : null;
  if (!id || !laneId || !status) return null;
  const at = typeof row.updated_at_ms === 'number' && Number.isFinite(row.updated_at_ms)
    ? row.updated_at_ms
    : 0;
  return {
    id,
    laneId,
    title: id,
    prompt: '',
    status,
    step: status,
    output: '',
    steering: [],
    attachments: [],
    createdAt: at,
    updatedAt: at,
    artifacts: []
  };
}
