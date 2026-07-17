import type { Json } from "./database.types";
import { supabase } from "./supabase";

export type OperationalEventType = "ui_error" | "repository_error" | "calculation_error" | "recovery_drill";

export interface OperationalIncident {
  readonly correlationId: string;
  readonly occurredAt: string;
}

interface StoredOperationalEvent extends OperationalIncident {
  readonly eventType: OperationalEventType;
  readonly messageCode: string;
  readonly errorName: string;
}

const STORAGE_KEY = "poolstruct:operational-events";
const MAX_LOCAL_EVENTS = 50;

function storeLocally(event: StoredOperationalEvent): void {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredOperationalEvent[];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([event, ...current].slice(0, MAX_LOCAL_EVENTS)));
  } catch {
    // Observability must never interrupt the engineering workflow.
  }
}

export async function reportOperationalError(
  eventType: OperationalEventType,
  messageCode: string,
  error: unknown,
  ownerId?: string
): Promise<OperationalIncident> {
  const event: StoredOperationalEvent = {
    correlationId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    eventType,
    messageCode,
    errorName: error instanceof Error ? error.name : "UnknownError"
  };
  console.error("POOLSTRUCT_OPERATIONAL_EVENT", event);
  storeLocally(event);

  if (supabase && ownerId) {
    const context: Json = { errorName: event.errorName, appVersion: "0.8.0" };
    await supabase.from("operational_events").insert({
      owner_id: ownerId,
      correlation_id: event.correlationId,
      event_type: eventType,
      severity: "error",
      message_code: messageCode,
      context
    }).then(({ error: persistenceError }) => {
      if (persistenceError) console.error("POOLSTRUCT_OBSERVABILITY_PERSISTENCE_FAILURE", persistenceError.name);
    });
  }
  return { correlationId: event.correlationId, occurredAt: event.occurredAt };
}
