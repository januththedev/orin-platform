import { randomUUID } from "node:crypto";
import type { EventEnvelopeV1 } from "@orin/contracts";

export interface CreateEventInput {
  readonly type: string;
  readonly product: string;
  readonly source: { service: string; component: string; instanceId?: string };
  readonly requestId: string;
  readonly traceId: string;
  readonly correlationId: string;
  readonly accountId?: string | null;
  readonly sessionId?: string | null;
  readonly runId?: string | null;
  readonly outcome: "started" | "succeeded" | "failed" | "denied" | "cancelled";
  readonly durationMs?: number | null;
  readonly errorCode?: string | null;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}
export function createEvent(input: CreateEventInput): EventEnvelopeV1 {
  return {
    schema_version: "1.0.0",
    event_id: randomUUID(),
    type: input.type,
    occurred_at: new Date().toISOString(),
    product: input.product,
    source: { service: input.source.service, component: input.source.component, ...(input.source.instanceId ? { instance_id: input.source.instanceId } : {}) },
    request_id: input.requestId,
    trace_id: input.traceId,
    correlation_id: input.correlationId,
    account_id: input.accountId ?? null,
    session_id: input.sessionId ?? null,
    run_id: input.runId ?? null,
    outcome: input.outcome,
    duration_ms: input.durationMs ?? null,
    error_code: input.errorCode ?? null,
    redacted_metadata: { ...(input.metadata ?? {}) },
  };
}
export type { EventEnvelopeV1 };
