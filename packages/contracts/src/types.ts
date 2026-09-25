export interface EventEnvelopeV1 {
  readonly schema_version: "1.0.0";
  readonly event_id: string;
  readonly type: string;
  readonly occurred_at: string;
  readonly product: string;
  readonly source: { readonly service: string; readonly component: string; readonly instance_id?: string };
  readonly request_id: string;
  readonly trace_id: string;
  readonly correlation_id: string;
  readonly account_id: string | null;
  readonly session_id: string | null;
  readonly run_id: string | null;
  readonly outcome: "started" | "succeeded" | "failed" | "denied" | "cancelled";
  readonly duration_ms: number | null;
  readonly error_code: string | null;
  readonly redacted_metadata: Readonly<Record<string, string | number | boolean | null>>;
}
export interface ErrorEnvelopeV1 { readonly error: { readonly code: string; readonly message: string; readonly retryable: boolean; readonly retry_after: number | null; readonly request_id: string }; }
export type ModelAliasV1 = "orin-cheap" | "orin-balanced" | "orin-thinking" | "orin-coding";
export interface SearchRequestV1 { readonly query: string; readonly n: number; readonly locale?: "en" | "si" | "ta"; readonly safe_search?: "off" | "moderate" | "strict"; }
