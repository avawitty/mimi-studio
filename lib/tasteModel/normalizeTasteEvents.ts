import type {
  AnyTasteEvent,
  LegacyTasteEvent,
  NormalizedTasteEvent,
  TasteEventV2,
  TasteLearningAction,
} from './contracts';
import { tasteEventV2Schema } from './contracts';

function isV2Event(event: AnyTasteEvent): event is TasteEventV2 {
  return 'schemaVersion' in event && event.schemaVersion === 2;
}

function legacyEventTypeToAction(
  eventType: LegacyTasteEvent['event_type'],
  behavioral?: LegacyTasteEvent['behavioral_signal'],
): TasteLearningAction {
  switch (eventType) {
    case 'view':
      if (behavioral?.interactionType === 'linger' || behavioral?.interactionType === 'study') {
        return 'linger';
      }
      return 'view';
    case 'save':
      return 'save';
    case 'tweak':
      return 'reuse';
    case 'scry':
      return 'view';
    case 'signature_feedback':
      return 'mark_signature';
    default:
      return 'view';
  }
}

function legacyPolarity(event: LegacyTasteEvent): -1 | 0 | 1 {
  if (event.event_type === 'signature_feedback' && event.signature_payload) {
    const feedback = event.signature_payload;
    const misses = Object.values(feedback.phrasingFeedback ?? {}).filter((v) => v === 'misses').length;
    const lands = Object.values(feedback.phrasingFeedback ?? {}).filter((v) => v === 'lands').length;
    if (feedback.toneFeedback === 'misses' || misses > lands) return -1;
    if (feedback.toneFeedback === 'lands' || lands > misses) return 1;
    return 0;
  }
  if (event.event_type === 'save' || event.event_type === 'tweak') return 1;
  return 0;
}

function legacyStrength(event: LegacyTasteEvent): number {
  if (event.behavioral_signal) {
    const { dwellMs, revisitCount, interactionType } = event.behavioral_signal;
    let s = 0.3;
    if (interactionType === 'linger') s = 0.5;
    if (interactionType === 'study') s = 0.7;
    if (interactionType === 'return') s = 0.6;
    if (dwellMs && dwellMs > 5000) s = Math.min(1, s + 0.2);
    if (revisitCount && revisitCount > 1) s = Math.min(1, s + 0.1 * revisitCount);
    return s;
  }
  if (event.event_type === 'save') return 0.7;
  if (event.event_type === 'signature_feedback') return 0.9;
  return 0.3;
}

/**
 * Normalize legacy TasteEvent or TasteEventV2 into a unified shape.
 * All legacy conditionals are centralized here.
 */
export function normalizeTasteEvent(event: AnyTasteEvent): NormalizedTasteEvent {
  if (isV2Event(event)) {
    const parsed = tasteEventV2Schema.safeParse(event);
    if (!parsed.success) {
      throw new Error(`Invalid TasteEventV2: ${parsed.error.message}`);
    }
    const v2 = parsed.data;
    return {
      id: v2.id,
      userId: v2.userId,
      projectId: v2.projectId,
      sessionId: v2.sessionId,
      action: v2.action,
      targetType: v2.target.type,
      targetId: v2.target.id,
      occurredAt: v2.occurredAt,
      surface: v2.context.surface,
      intent: v2.context.intent,
      scope: v2.context.scope,
      polarity: v2.signal.polarity,
      strength: v2.signal.strength,
      explicit: v2.signal.explicit,
      dwellMs: v2.signal.dwellMs,
      revisitCount: v2.signal.revisitCount,
      evidenceNodeIds: v2.provenance.evidenceNodeIds,
      observationIds: v2.provenance.observationIds,
      patternClusterIds: v2.provenance.patternClusterIds,
      creativeLawIds: v2.provenance.creativeLawIds,
      dedupeKey: v2.dedupeKey,
      sourceSchema: 2,
    };
  }

  const legacy = event as LegacyTasteEvent;
  const action = legacyEventTypeToAction(legacy.event_type, legacy.behavioral_signal);
  const polarity = legacyPolarity(legacy);
  const explicit = legacy.event_type === 'signature_feedback';

  const targetId =
    legacy.output_context?.zineId ??
    legacy.input_context?.selected_archetype ??
    legacy.input_context?.raw_text?.slice(0, 64) ??
    'unknown';

  return {
    id: legacy.id ?? `legacy-${legacy.timestamp}-${legacy.event_type}`,
    userId: legacy.userId,
    projectId: undefined,
    sessionId: legacy.sessionId,
    action,
    targetType: 'artifact',
    targetId,
    occurredAt: legacy.timestamp,
    surface: legacy.input_context?.user_intent ?? 'legacy',
    intent: legacy.input_context?.user_intent,
    scope: 'persistent',
    polarity,
    strength: legacyStrength(legacy),
    explicit,
    dwellMs: legacy.behavioral_signal?.dwellMs,
    revisitCount: legacy.behavioral_signal?.revisitCount,
    evidenceNodeIds: [],
    observationIds: [],
    patternClusterIds: [],
    creativeLawIds: [],
    sourceSchema: 1,
  };
}

/**
 * Normalize a batch of mixed legacy and v2 events.
 */
export function normalizeTasteEvents(events: AnyTasteEvent[]): NormalizedTasteEvent[] {
  return events.map(normalizeTasteEvent);
}

/**
 * Collapse duplicate learning events by dedupe key (or id) before compilation.
 * Keeps the newest occurrence when legacy duplicates exist in storage.
 */
export function dedupeTasteEventsForCompile(
  events: NormalizedTasteEvent[],
): NormalizedTasteEvent[] {
  const byKey = new Map<string, NormalizedTasteEvent>();

  for (const event of events) {
    const key = event.dedupeKey ?? event.id;
    const existing = byKey.get(key);
    if (!existing || event.occurredAt >= existing.occurredAt) {
      byKey.set(key, event);
    }
  }

  return [...byKey.values()].sort((a, b) => a.occurredAt - b.occurredAt);
}

/**
 * Stable dedupe key for explicit curation / correction actions.
 * Omits time bucketing so replaying the same action cannot append twice.
 */
export function buildStableTasteEventDedupeKey(
  userId: string,
  action: TasteLearningAction,
  targetType: string,
  targetId: string,
): string {
  return `${userId}:${action}:${targetType}:${targetId}`;
}

/**
 * Time-bucketed dedupe key for passive/implicit behavioral events.
 */
export function buildTasteEventDedupeKey(
  userId: string,
  action: TasteLearningAction,
  targetType: string,
  targetId: string,
  occurredAtBucket: number,
): string {
  return `${buildStableTasteEventDedupeKey(userId, action, targetType, targetId)}:${occurredAtBucket}`;
}
