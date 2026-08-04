import { sendJson, sendText } from "../lib/apiUtils.js";
import { proxyToFunctions } from "../lib/proxyToFunctions.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    sendJson(res, 500, { error: "STRIPE_WEBHOOK_SECRET is not configured" });
    return;
  }

  try {
    const { getStripeClient, handleStripeWebhookEvent, readRawBody } = await import(
      "../lib/stripeMembership.js"
    );
    const { getServerFirebaseAdmin } = await import("../lib/serverFirebaseAdmin.js");

    const stripe = getStripeClient();
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      sendText(res, 400, "Missing stripe-signature header");
      return;
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    const { isNeonOperationalDatabaseConfigured } = await import(
      "../infrastructure/database/neon/connection.js"
    );
    const neonStripeEnabled =
      process.env.MIMI_NEON_STRIPE_RECONCILIATION === "1";
    let neonReconciliationResult:
      | { duplicate?: boolean; ignored?: boolean }
      | null = null;
    if (neonStripeEnabled) {
      if (!isNeonOperationalDatabaseConfigured()) {
        sendJson(res, 503, {
          received: false,
          error: "Neon Stripe reconciliation is enabled but DATABASE_URL is unavailable.",
        });
        return;
      }
      try {
        const [
          { normalizeStripeMembershipEvent },
          { getNeonMembershipReconciliationService },
        ] =
          await Promise.all([
            import("../infrastructure/stripe/normalizeMembershipEvent.js"),
            import("../infrastructure/database/neon/membershipRuntime.js"),
          ]);
        const normalized = await normalizeStripeMembershipEvent(stripe, event);
        if (!normalized) {
          neonReconciliationResult = { ignored: true };
        } else {
          const result =
            await getNeonMembershipReconciliationService().process(normalized);
          neonReconciliationResult = { duplicate: result.duplicate };
        }
      } catch (error) {
        // Signature is already verified, but membership/credit persistence is
        // essential. Return 5xx so Stripe retries; the failed event state is
        // also retained in Neon when reconciliation reached the repository.
        console.error("MIMI // Neon Stripe reconciliation failed:", error);
        sendJson(res, 500, {
          received: false,
          reconciliation: "failed",
        });
        return;
      }
      // Fall through to the legacy Firestore projection until chamber readers
      // migrate off Firestore membership and credit fields.
    }

    const { db } = getServerFirebaseAdmin();

    if (!db) {
      const proxied = await proxyToFunctions("/api/stripe-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": Array.isArray(signature) ? signature[0] : String(signature),
        },
        body: rawBody,
      });

      res.statusCode = proxied.status;
      res.setHeader("Content-Type", proxied.headers.get("content-type") || "application/json");
      res.end(proxied.text);
      return;
    }

    const eventRef = db.collection("stripe_webhook_events").doc(event.id);
    let shouldProcess = true;
    const now = Date.now();

    await db.runTransaction(async (transaction: any) => {
      const snapshot = await transaction.get(eventRef);
      const data = snapshot.data();
      const processingRecently =
        data?.status === "processing" &&
        now - Number(data?.startedAt || 0) < 5 * 60 * 1000;

      if (data?.status === "completed" || processingRecently) {
        shouldProcess = false;
        return;
      }

      transaction.set(eventRef, {
        status: "processing",
        type: event.type,
        startedAt: now,
      });
    });

    if (!shouldProcess) {
      sendJson(res, 200, {
        received: true,
        duplicate: true,
        ...(neonReconciliationResult
          ? { neonReconciliation: neonReconciliationResult }
          : {}),
      });
      return;
    }

    try {
      await handleStripeWebhookEvent(db, stripe, event);
      await eventRef.set(
        { status: "completed", completedAt: Date.now() },
        { merge: true },
      );
      sendJson(res, 200, {
        received: true,
        ...(neonReconciliationResult
          ? { neonReconciliation: neonReconciliationResult }
          : {}),
      });
    } catch (error) {
      await eventRef.delete().catch((): undefined => undefined);
      throw error;
    }
  } catch (error: any) {
    console.error("MIMI // Stripe webhook error:", error);
    sendText(res, 400, `Webhook Error: ${error.message || "Invalid payload"}`);
  }
}
