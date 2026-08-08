import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseInit";
import type {
  EvidenceAtom,
  TasteAssertion,
  TasteAxis,
  TasteConcept,
  TasteScope,
  TasteState,
} from "../../lib/taste/types";

const USER_COLLECTION_LIMIT = 250;

function assertionWeight(assertion: TasteAssertion, context?: TasteScope): number {
  const confirmationWeight =
    assertion.claimType === "user_confirmed"
      ? 1.2
      : assertion.claimType === "user_rejected"
        ? 0.25
        : assertion.claimType === "observed"
          ? 1
          : 0.8;

  const contextWeight =
    !context || !assertion.context || assertion.context === context || assertion.context === "global"
      ? 1
      : 0.45;

  const ageDays = Math.max(0, (Date.now() - assertion.updatedAt) / 86_400_000);
  const recencyWeight = Math.max(0.55, Math.exp(-ageDays / 180));
  return assertion.confidence * confirmationWeight * contextWeight * recencyWeight;
}

export async function getTasteState(
  userId: string,
  context?: TasteScope,
): Promise<TasteState> {
  if (!userId || userId === "ghost") {
    throw new Error("A signed-in Mimi user is required to build Taste State.");
  }

  const [assertionSnap, conceptSnap, axisSnap, evidenceSnap] = await Promise.all([
    getDocs(collection(db, "users", userId, "tasteAssertions")),
    getDocs(collection(db, "users", userId, "tasteConcepts")),
    getDocs(collection(db, "users", userId, "tasteAxes")),
    getDocs(
      query(
        collection(db, "users", userId, "evidenceAtoms"),
        orderBy("createdAt", "desc"),
        limit(USER_COLLECTION_LIMIT),
      ),
    ),
  ]);

  const assertions = assertionSnap.docs
    .map((item) => item.data() as TasteAssertion)
    .filter((item) => !context || !item.context || item.context === "global" || item.context === context)
    .map((item) => ({ item, weight: assertionWeight(item, context) }))
    .sort((a, b) => b.weight - a.weight);

  const isRetired = (item: TasteAssertion) => item.correction === "NOT_ANYMORE";

  const stablePreferences = assertions
    .filter(({ item, weight }) =>
      !isRetired(item) &&
      item.relation !== "DISLIKES" &&
      item.claimType !== "user_rejected" &&
      weight >= 0.72,
    )
    .map(({ item }) => item);

  const negativePreferences = assertions
    .filter(({ item }) => !isRetired(item) && (item.relation === "DISLIKES" || item.claimType === "user_rejected"))
    .map(({ item }) => item);

  const emergingPreferences = assertions
    .filter(({ item, weight }) =>
      !isRetired(item) &&
      item.relation !== "DISLIKES" &&
      item.claimType !== "user_rejected" &&
      weight < 0.72,
    )
    .map(({ item }) => item);

  const concepts = conceptSnap.docs.map((item) => item.data() as TasteConcept);
  const currentExplorations = concepts.filter((concept) =>
    concept.contexts.some(
      (entry) =>
        (!context || entry.scope === context || entry.scope === "global") &&
        (entry.trend === "rising" || (entry.strength > 0.4 && concept.isInferred)),
    ),
  );

  const inferredAxes = axisSnap.docs
    .map((item) => item.data() as TasteAxis)
    .filter((axis) => !axis.isConfirmed || axis.confidence >= 0.5);

  const relevantEvidence = evidenceSnap.docs.map((item) => item.data() as EvidenceAtom);
  const scored = assertions.filter(({ item }) => item.claimType !== "user_rejected" && !isRetired(item));
  const confidence = scored.length
    ? Math.min(1, scored.reduce((sum, entry) => sum + entry.weight, 0) / scored.length)
    : 0;

  return {
    userId,
    context,
    stablePreferences,
    negativePreferences,
    emergingPreferences,
    currentExplorations,
    tensions: [],
    inferredAxes,
    relevantEvidence,
    confidence: Number(confidence.toFixed(3)),
    recentChanges: assertions
      .filter(({ item }) => Date.now() - item.updatedAt < 30 * 86_400_000)
      .slice(0, 12)
      .map(({ item }) => ({
        label: item.conceptA,
        direction:
          item.correction === "NOT_ANYMORE"
            ? "not_anymore"
            : item.claimType === "user_rejected"
              ? "rejected"
              : item.relation.toLowerCase(),
        at: item.updatedAt,
      })),
    generatedAt: Date.now(),
  };
}
