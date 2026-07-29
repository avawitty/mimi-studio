import { sendJson, sendText } from "../lib/apiUtils.js";
import { getServerFirebaseAdmin } from "../lib/serverFirebaseAdmin.js";
import {
  getStripeClient,
  handleStripeWebhookEvent,
  readRawBody,
} from "../lib/stripeMembership.js";
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
    const stripe = getStripeClient();
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      sendText(res, 400, "Missing stripe-signature header");
      return;
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
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

    await db.runTransaction(async (transaction) => {
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
      sendJson(res, 200, { received: true, duplicate: true });
      return;
    }

    try {
      await handleStripeWebhookEvent(db, stripe, event);
      await eventRef.set(
        { status: "completed", completedAt: Date.now() },
        { merge: true },
      );
      sendJson(res, 200, { received: true });
    } catch (error) {
      await eventRef.delete().catch((): undefined => undefined);
      throw error;
    }
  } catch (error: any) {
    console.error("MIMI // Stripe webhook error:", error);
    sendText(res, 400, `Webhook Error: ${error.message || "Invalid payload"}`);
  }
}
