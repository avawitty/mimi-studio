import { auth } from "../firebaseInit";

/**
 * Request server-side interpretation for a newly created evidence atom.
 * Fire-and-forget — failures are logged only.
 */
export function scheduleEvidenceAtomAnalysis(atomId: string): void {
  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch("/api/mimi/evidence/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-token": `Bearer ${token}`,
        },
        body: JSON.stringify({ atomId }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.warn("MIMI // evidence analyze request failed:", response.status, text.slice(0, 120));
      }
    } catch (err) {
      console.warn("MIMI // scheduleEvidenceAtomAnalysis failed:", err);
    }
  })();
}
