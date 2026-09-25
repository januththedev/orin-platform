export interface TelemetrySink { emit(event: unknown): Promise<void>; }
export async function emitBestEffort(sink: TelemetrySink, event: unknown): Promise<void> {
  try { await sink.emit(event); } catch { /* diagnostics never block a request */ }
}
