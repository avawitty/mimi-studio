
import { ensureDb } from "./firebase";
import { collection, addDoc, doc, runTransaction, getDoc, updateDoc } from "firebase/firestore";
import { TasteEvent, DriftEvent, TasteProfile, ProductTasteEvent } from "../types";
import { logEvent } from "firebase/analytics";
import { analytics } from "./firebaseInit";
import { isAnalyticsAllowed } from "../lib/cookieConsent";

const COLLECTION_NAME = "taste_events";
const PRODUCT_INTERACTION_COLLECTION = "product_interactions";
const USER_COLLECTION = "profiles_public";

export const logProductTasteEvent = async (event: ProductTasteEvent): Promise<void> => {
  try {
    const db = await ensureDb();
    await addDoc(collection(db, PRODUCT_INTERACTION_COLLECTION), event);
  } catch (error) {
    console.warn("MIMI // Product Interaction Log Dropped:", error);
  }
};

export const logTasteEvent = async (event: TasteEvent): Promise<void> => {
  try {
    const db = await ensureDb();
    
    // 1. Log raw event to history
    await addDoc(collection(db, COLLECTION_NAME), event);

    // 2. Analytics Mirror (opt-in only; no uid in analytics payload)
    if (analytics && isAnalyticsAllowed()) {
      logEvent(analytics, 'taste_signal', {
        type: event.event_type,
        intent: event.input_context.user_intent,
      });
    }

    // 3. Aggregate Learning (Transactional)
    if (event.event_type === 'save' && event.userId && !event.userId.startsWith('local_')) {
       await aggregateUserProfile(event);
    }

  } catch (error) {
    console.warn("MIMI // Taste Log Dropped:", error);
  }
};

// Sigmoid normalization for taste vector
function sigmoidNormalize(value: number): number {
    return 1 / (1 + Math.exp(-0.5 * (value - 5)));
}

const aggregateUserProfile = async (event: TasteEvent): Promise<void> => {
    try {
        const db = await ensureDb();
        const userRef = doc(db, USER_COLLECTION, event.userId);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            // Initialize if missing
            const taste: TasteProfile = userData.tasteProfile || {
                archetype_weights: {},
                color_frequency: {}
            };
            if (!taste.archetype_weights) taste.archetype_weights = {};
            if (!taste.color_frequency) taste.color_frequency = {};

            // Clone for drift detection comparison
            const oldTaste = JSON.parse(JSON.stringify(taste));

            // STEP 1: Increment Weights based on OUTPUT (Active Result)
            // We use output_context because that's what was actually manifested and accepted
            const genArchetype = event.output_context.generated_archetype || event.input_context.selected_archetype;
            if (genArchetype) {
                taste.archetype_weights[genArchetype] = (taste.archetype_weights[genArchetype] || 0) + 1;
            }

            // Normalize weights to 0-1
            const normalizedWeights: Record<string, number> = {};
            Object.entries(taste.archetype_weights).forEach(([key, val]) => {
                normalizedWeights[key] = sigmoidNormalize(val);
            });
            taste.archetype_weights = normalizedWeights;

            if (event.output_context.colors?.length) {
                event.output_context.colors.forEach(hex => {
                    taste.color_frequency[hex] = (taste.color_frequency[hex] || 0) + 1;
                });
            }

            // STEP 2: Detect Drift (Existing)
            const driftEvent = detectTasteDrift(taste, oldTaste, event.output_context.zineId || 'unknown');
            if (driftEvent) {
                taste.audit_history = taste.audit_history || [];
                taste.audit_history.push(driftEvent);
            }

            // STEP 3: Update Semantic Signature
            taste.semantic_signature = generateSemanticSignature(taste.archetype_weights, taste.color_frequency);

            // STEP 4: GEO Engine Drift Detection (PROMPT 2 Logic)
            let updatedGeoProfile = userData.geoProfile || null;
            if (updatedGeoProfile && updatedGeoProfile.retrievalIdentity && updatedGeoProfile.retrievalIdentity.semanticClusters) {
                // Extract temporary semantic tags from event
                const textTokens = (event.input_context?.raw_text || '').toLowerCase().split(/\W+/).filter(t => t.length > 3);
                const archToken = (event.output_context?.generated_archetype || '').toLowerCase();
                const eventTags = [...new Set([...textTokens, archToken])].filter(Boolean);

                if (eventTags.length > 0) {
                    const clusters = updatedGeoProfile.retrievalIdentity.semanticClusters.map((c: string) => c.toLowerCase());
                    let overlapCount = 0;
                    eventTags.forEach(tag => {
                        if (clusters.some((c: string) => c.includes(tag) || tag.includes(c))) {
                            overlapCount++;
                        }
                    });

                    const overlapPercentage = overlapCount / eventTags.length;
                    
                    // If < 30% overlap, increment drift
                    if (overlapPercentage < 0.3) {
                        updatedGeoProfile.driftScore = (updatedGeoProfile.driftScore || 0) + 1;
                        if (updatedGeoProfile.driftScore >= 5) {
                            updatedGeoProfile.driftAlert = true;
                        }
                    }
                }
            }

            // STEP 5: Commit
            transaction.update(userRef, {
                "tasteProfile": taste,
                "geoProfile": updatedGeoProfile,
                "lastActive": Date.now()
            });

            // STEP 6: Emit local event for UI (outside transaction but triggered by its success logic)
            // Note: In a real server env we'd do this differently, but for client-side coord:
            if (driftEvent) {
                window.dispatchEvent(new CustomEvent('mimi:drift_detected', { detail: driftEvent }));
            }
        });

    } catch (e) {
        console.warn("MIMI // Aggregation Failed:", e);
    }
};

// HELPER: Detect significant shifts in taste
function detectTasteDrift(newTaste: TasteProfile, oldTaste: TasteProfile, triggerId: string): DriftEvent | null {
    const getTop = (record: Record<string, number>) => Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    const newTopArch = getTop(newTaste.archetype_weights);
    const oldTopArch = getTop(oldTaste.archetype_weights);

    if (newTopArch && oldTopArch && newTopArch !== oldTopArch) {
        return {
            type: 'archetype_shift',
            timestamp: Date.now(),
            before: { archetype: oldTopArch },
            after: { archetype: newTopArch },
            magnitude: 100, // Normalized magnitude
            triggerZineId: triggerId
        };
    }
    
    // Future: Add color drift detection here
    return null;
}

// HELPER: Generate a poetic string based on weights (Heuristic for now)
function generateSemanticSignature(archetypes: Record<string, number>, colors: Record<string, number>): string {
    const topArch = Object.entries(archetypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    const topColor = Object.entries(colors).sort((a, b) => b[1] - a[1])[0]?.[0] || '#000000';
    
    // Simple heuristic mapper
    const formatArch = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${formatArch(topArch)} • ${topColor}`;
}

// Initialize Session
if (typeof window !== 'undefined' && window.sessionStorage) {
    if (!window.sessionStorage.getItem('mimi_session_id')) {
        window.sessionStorage.setItem('mimi_session_id', crypto.randomUUID());
    }
}
