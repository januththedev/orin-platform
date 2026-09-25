import type { EventEnvelopeV1 } from "@orin/contracts";
export interface DurableEventStore { append(event: EventEnvelopeV1): Promise<{ readonly eventId: string }>; }
export async function withRequiredEvent<T>(store: DurableEventStore, event: EventEnvelopeV1, operation: () => Promise<T>): Promise<T> {
  await store.append(event);
  return operation();
}
