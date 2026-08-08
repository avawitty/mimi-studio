import express from "express";
import Stripe from "stripe";
import path from "path";
import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";
import { jsPDF } from "jspdf";
import { config as loadEnv } from "dotenv";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { registerTailorRoutes } from './server/tailorRoutes';
import { registerOperationalRoutes } from './server/operationalRoutes';
import { buildSessionCookieHeader, clearSessionCookieHeader, SESSION_EXPIRES_MS } from './lib/sessionCookie';
import { proxySessionLogin } from './lib/proxySessionToFunctions';
import mimiImageHandler from "./api/mimi-image";
import generateTextHandler from "./api/mimi/generate-text";
import embedHandler from "./api/mimi/embed";
import aiGatewayProxyHandler from "./api/proxy/ai-gateway";
import createCheckoutSessionHandler from "./api/create-checkout-session";
import createBillingPortalSessionHandler from "./api/create-billing-portal-session";
import applyPromoHandler from "./api/apply-promo";
import stripeWebhookHandler from "./api/stripe-webhook";
import { injectTasteCorpusPageHtml } from "./lib/taste-corpus/serverInject.js";
import {
  embedGeminiContentViaGateway,
  generateGeminiContentViaGateway,
  generateGeminiImageViaGateway,
  generateGeminiImagesViaGateway,
  generateGeminiVideoViaGateway,
  pollGatewayVideoOperation,
  getServerAiGatewayKey,
  isGeminiImageRequest,
  openAiMessagesViaGateway,
} from "./lib/aiGatewayCompat";
import createZineHandler from "./api/mimi/create-zine";
import analyzeImageHandler from "./api/mimi/analyze-image";
import analyzeSignalsHandler from "./api/mimi/analyze-signals";
import generateSpecHandler from "./api/mimi/generate-spec";
import generateImageHandler from "./api/mimi/generate-image";
import synthesizeDossierHandler from "./api/mimi/synthesize-dossier";
import { handleMimiEvidenceRoute } from "./lib/mimiEvidenceRoute";
import { handleMimiEvidenceAnalyzeRoute } from "./lib/mimiEvidenceAnalyzeRoute";
import { handleMimiTasteStateRoute } from "./lib/mimiTasteStateRoute";
import { handleMimiTasteGraphSummaryRoute } from "./lib/mimiTasteGraphSummaryRoute";
import {
  handleMimiUsedContextGetRoute,
  handleMimiUsedContextPutRoute,
} from "./lib/mimiUsedContextRoute";
import { fetchPinterestBoardPreview } from "./lib/pinterestBoardPreview";
import { fetchLetterboxdFeed } from "./lib/letterboxdFeed";
import { getShopifyConnectionStatus, publishShopifyDraft } from "./lib/shopifyAdmin";
import { searchShopifyGlobalCatalog } from "./lib/shopifyCatalog";
import { verifyMimiSession } from "./lib/serverFirebaseAdmin";
import { handleCreatorFeedRequest } from "./api/feed";
import youSearchHandler from "./api/you-search";
import forecastHandler from "./api/forecast";
import celestialGeocodeHandler from "./api/celestial/geocode";
import celestialGeocodeSuggestHandler from "./api/celestial/geocode-suggest";
import residueAcquireHandler from "./api/residue-acquire";
import collectiveMmmReportHandler from "./api/collective/mmm-report";
import liveTokenHandler from "./api/live/token";
import sovereignCommunityHandler from "./api/sovereign/community";
import sovereignZineHandler from "./api/sovereign/zine";
import sovereignStatusHandler from "./api/sovereign/status";
import sovereignProfileHandler from "./api/sovereign/profile";
import sovereignPocketHandler from "./api/sovereign/pocket";
import sovereignImportHandler from "./api/sovereign/import";
import sovereignReindexHandler from "./api/sovereign/reindex";
import sovereignEventsHandler from "./api/sovereign/events";
import sovereignPingHandler from "./api/sovereign/ping";
import { sovereignStatus, getProfileByHandle } from "./lib/sovereign/store";
import { isPaidPatronPlan } from "./constants";
import { normalizeFeedHandle } from "./lib/publicFeedQuery.js";
import { getPublicBaseUrl } from "./lib/publicBaseUrl.js";
import {
  buildPublicProfileSeoData,
  injectPublicProfileSEOMetadata,
} from "./lib/publicProfileSeo.js";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env.firebase.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

// Keep service-account credentials outside the repository. Local development can
// point at the downloaded JSON file without duplicating its private key.
if (
  !process.env.FIREBASE_SERVICE_ACCOUNT &&
  process.env.FIREBASE_SERVICE_ACCOUNT_FILE
) {
  const serviceAccountPath = path.resolve(
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
  );
  if (fs.existsSync(serviceAccountPath)) {
    process.env.FIREBASE_SERVICE_ACCOUNT = fs.readFileSync(
      serviceAccountPath,
      "utf8",
    );
  }
}

// Enable server AI only when a server-owned provider key is configured.
if (
  !process.env.MIMI_ENABLE_SERVER_AI &&
  (
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.REPLICATE_API_TOKEN ||
    process.env.REPLICATE_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN
  )
) {
  process.env.MIMI_ENABLE_SERVER_AI = "true";
}

// Set UNDICI_AGENT_OPTIONS to increase the timeout for global fetch calls (undici in Node) to 5 minutes
// This prevents HeadersTimeoutError / fetch failed on slow-thinking Pro model requests
process.env.UNDICI_AGENT_OPTIONS = '{"headersTimeout":300000,"bodyTimeout":300000}';

// Initialize Firebase Admin (lazy or try/catch)
let db: FirebaseFirestore.Firestore | null = null;
try {
  // If FIREBASE_SERVICE_ACCOUNT is provided, use it. Otherwise do not initialize.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
    // Named DB matches firebase-applet-config; `(default)` does not exist on mimistudios.
    const databaseId =
      process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
      'ai-studio-mimi-4c383b50-c596-4b43-8a2e-61d0645e590a';
    db = getFirestore(databaseId);
    console.log('Firebase Admin initialized successfully.');
  } else {
    console.log('FIREBASE_SERVICE_ACCOUNT not provided. Firebase Admin will not be initialized.');
  }
} catch (e) {
  console.log('Firebase Admin not initialized. Webhooks will not update Firestore automatically unless configured.');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || process.env.DEV_PORT) || 3000;
  let viteInstance: any = null;

  // Lazy initialize Stripe to prevent crashing if key is missing
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      stripeClient = new Stripe(key);
    }
    return stripeClient;
  }

  // Webhook must be before express.json() to preserve Stripe's signed raw body.
  // This shared handler is registered first; the legacy handler below is retained
  // temporarily for source compatibility but is not reached without next().
  app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    await stripeWebhookHandler(req, res);
  });

  // Legacy webhook implementation (shadowed by the shared handler above).
  app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      if (!endpointSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error(`MIMI // Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id; 
      const customerId = session.customer as string;
      
      if (userId && db) {
        try {
          // Retrieve the line items to get the price ID
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          
          let plan = "free";
          let interval = "month";
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            plan = price.metadata.plan || "free";
            interval = price.recurring?.interval || "month";
          }

          await db.collection("users").doc(userId).set({
            planStatus: plan,
            plan,
            stripeCustomerId: customerId,
            subscriptionStatus: "active",
            subscriptionInterval: interval,
          }, { merge: true });
          
          await db.collection("profiles_public").doc(userId).set({
            planStatus: plan,
            plan,
            subscriptionStatus: "active",
          }, { merge: true });

          await db.collection("memberships").doc(userId).set({
            plan,
            stripeCustomerId: customerId,
            status: "active",
            interval,
          }, { merge: true });
          console.log(`Successfully updated user ${userId} to plan ${plan}`);
        } catch (dbErr) {
          console.error('MIMI // Error updating user in Firestore:', dbErr);
        }
      } else {
        console.log('No userId found in session or DB not initialized', { userId, dbInitialized: !!db });
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      if (customerId && db) {
        try {
          // Find user by customer ID
          const usersRef = db.collection("users");
          const snapshot = await usersRef.where("stripeCustomerId", "==", customerId).get();
          
          if (!snapshot.empty) {
            const userId = snapshot.docs[0].id;
            const lines = invoice.lines.data;
            const priceId = (lines[0] as any)?.price?.id;
            
            let plan = "free";
            let interval = "month";
            if (priceId) {
              const price = await stripe.prices.retrieve(priceId);
              plan = price.metadata.plan || "free";
              interval = price.recurring?.interval || "month";
            }

            await db.collection("users").doc(userId).set({
              planStatus: plan,
              plan,
              subscriptionStatus: "active",
              subscriptionInterval: interval,
            }, { merge: true });
            
            await db.collection("profiles_public").doc(userId).set({
              planStatus: plan,
              plan,
              subscriptionStatus: "active",
            }, { merge: true });

            await db.collection("memberships").doc(userId).set({
              plan,
              status: "active",
              interval,
            }, { merge: true });
            console.log(`Successfully updated user ${userId} to plan ${plan}`);
          }
        } catch (dbErr) {
          console.error('MIMI // Error updating user in Firestore from invoice:', dbErr);
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      if (customerId && db) {
        try {
          const usersRef = db.collection("users");
          const snapshot = await usersRef.where("stripeCustomerId", "==", customerId).get();
          
          if (!snapshot.empty) {
            const userId = snapshot.docs[0].id;
            await db.collection("users").doc(userId).set({
              plan: "free",
              subscriptionStatus: "inactive",
            }, { merge: true });
            
            await db.collection("profiles_public").doc(userId).set({
              plan: "free",
              subscriptionStatus: "inactive",
            }, { merge: true });

            await db.collection("memberships").doc(userId).set({
              plan: "free",
              status: "inactive",
            }, { merge: true });
            console.log(`Successfully downgraded user ${userId} to free plan`);
          }
        } catch (dbErr) {
          console.error('MIMI // Error downgrading user in Firestore:', dbErr);
        }
      }
    }
    res.json({received: true});
  });

  // Middleware to parse JSON bodies for all other routes
  app.use(express.json({ limit: '50mb' }));

  if (db) {
    registerTailorRoutes(app, db);
  }
  registerOperationalRoutes(app);

  async function generateViaGatewayFallback(messages: any[], systemInstruction: string, temperature: number, format: 'openai' | 'anthropic') {
    const gatewayKey = getServerAiGatewayKey();
    if (!gatewayKey) {
      throw new Error("No server-side AI Gateway key configured.");
    }
    return openAiMessagesViaGateway(
      messages,
      systemInstruction,
      temperature,
      gatewayKey,
      format,
    );
  }

  app.post("/api/proxy/anthropic", async (req, res) => {
    try {
      const gatewayKey = getServerAiGatewayKey();
      if (gatewayKey) {
        const messages = req.body.messages || [];
        const systemInstruction = req.body.system || "";
        const result = await openAiMessagesViaGateway(
          messages,
          systemInstruction,
          req.body.temperature,
          gatewayKey,
          "anthropic",
        );
        return res.json(result);
      }

      let apiKey = (req.headers['x-api-key'] as string || '').trim();
      const userToken = req.headers['authorization']?.split('Bearer ')[1];
      
      // If client didn't send a personal API key, they are requesting advanced generation via Stripe proxy
      if ((!apiKey || apiKey === 'undefined') && userToken && db) {
        try {
          const decoded = await getAuth().verifyIdToken(userToken);
          const userDoc = await db.collection("users").doc(decoded.uid).get();
          const userData = userDoc.data() || {};
          if (isPaidPatronPlan(userData.planStatus || userData.mimiPlan || userData.plan)) {
            apiKey = process.env.ANTHROPIC_API_KEY || '';
          }
        } catch (authErr) {
          console.error("MIMI // Stripe Proxy Auth Error", authErr);
        }
      }

      // If no provider-specific key is set, use the server AI Gateway.
      if (!apiKey || apiKey === 'undefined' || apiKey === '') {
        const messages = req.body.messages || [];
        const systemInstruction = req.body.system || '';
        const temperature = req.body.temperature;
        
        console.log("MIMI // Anthropic Proxy: routing through Vercel AI Gateway.");
        const fallbackResult = await generateViaGatewayFallback(messages, systemInstruction, temperature, 'anthropic');
        return res.json(fallbackResult);
      }

      const fetchReq = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': req.headers['anthropic-version'] as string || '2023-06-01',
          'anthropic-dangerously-allow-custom-headers': 'true'
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await fetchReq.text();
      res.status(fetchReq.status).send(data);
    } catch (e: any) {
      console.warn("MIMI // Anthropic Proxy failed, attempting AI Gateway fallback.", e.message);
      try {
        const messages = req.body.messages || [];
        const systemInstruction = req.body.system || '';
        const temperature = req.body.temperature;
        const fallbackResult = await generateViaGatewayFallback(messages, systemInstruction, temperature, 'anthropic');
        return res.json(fallbackResult);
      } catch (err: any) {
        res.status(500).json({ error: { message: err.message }});
      }
    }
  });

  app.post("/api/proxy/ai-gateway", async (req, res) => {
    try {
      await aiGatewayProxyHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/proxy/ai-gateway:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/proxy/openai", async (req, res) => {
    try {
      const gatewayKey = getServerAiGatewayKey();
      if (gatewayKey) {
        const messages = req.body.messages || [];
        const systemInstruction = messages.find((message: any) => message.role === "system")?.content || "";
        const userMessages = messages.filter((message: any) => message.role !== "system");
        const result = await openAiMessagesViaGateway(
          userMessages,
          systemInstruction,
          req.body.temperature,
          gatewayKey,
          "openai",
        );
        return res.json(result);
      }

      let authHeader = (req.headers['authorization'] as string || '').trim();
      const userToken = req.headers['x-user-token'] as string;
      
      // Check subscription status via user token
      if (userToken && userToken.startsWith('Bearer ey')) {
          if (db) {
            try {
              const decoded = await getAuth().verifyIdToken(userToken.split('Bearer ')[1]);
              const userDoc = await db.collection("users").doc(decoded.uid).get();
              const userData = userDoc.data() || {};
              if (isPaidPatronPlan(userData.planStatus || userData.mimiPlan || userData.plan)) {
                authHeader = `Bearer ${process.env.OPENAI_API_KEY}`;
              }
            } catch (e) {
                // Fail silently and don't grant advanced access
            }
         }
      }

      // If no provider-specific key is set, use the server AI Gateway.
      if (!authHeader || authHeader === 'Bearer undefined' || authHeader === 'Bearer') {
        const messages = req.body.messages || [];
        const systemInstruction = messages.find((m: any) => m.role === 'system')?.content || '';
        const userMessages = messages.filter((m: any) => m.role !== 'system');
        const temperature = req.body.temperature;

        console.log("MIMI // OpenAI Proxy: routing through Vercel AI Gateway.");
        const fallbackResult = await generateViaGatewayFallback(userMessages, systemInstruction, temperature, 'openai');
        return res.json(fallbackResult);
      }

      const fetchReq = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await fetchReq.text();
      res.status(fetchReq.status).send(data);
    } catch (e: any) {
      console.warn("MIMI // OpenAI Proxy failed, attempting AI Gateway fallback.", e.message);
      try {
        const messages = req.body.messages || [];
        const systemInstruction = messages.find((m: any) => m.role === 'system')?.content || '';
        const userMessages = messages.filter((m: any) => m.role !== 'system');
        const temperature = req.body.temperature;
        const fallbackResult = await generateViaGatewayFallback(userMessages, systemInstruction, temperature, 'openai');
        return res.json(fallbackResult);
      } catch (err: any) {
        res.status(500).json({ error: { message: err.message }});
      }
    }
  });

  function generateProceduralSVG(prompt: string, aspectRatio: string): string {
    const normalizedPrompt = prompt.toLowerCase();
    
    // Determine dimensions based on aspect ratio
    let w = 800;
    let h = 800;
    if (aspectRatio === "16:9") { w = 800; h = 450; }
    else if (aspectRatio === "9:16") { w = 450; h = 800; }
    else if (aspectRatio === "4:3") { w = 800; h = 600; }
    else if (aspectRatio === "3:4") { w = 600; h = 800; }
    
    const hexRegex = /#[0-9a-fA-F]{6}\b/g;
    const matches = prompt.match(hexRegex);
    const customColors = matches ? Array.from(new Set(matches)) : [];

    let bg = "#121214";
    let content = "";
    
    if (customColors.length > 0) {
      const c1 = customColors[0] || "#121214";
      const c2 = customColors[1] || "#ff007f";
      const c3 = customColors[2] || "#00f0ff";
      const c4 = customColors[3] || "#ffffff";
      const c5 = customColors[4] || c3;

      bg = c1;
      content = `
        <defs>
          <radialGradient id="customGrad1" cx="30%" cy="30%" r="75%">
            <stop offset="0%" stop-color="${c2}" stop-opacity="0.6"/>
            <stop offset="60%" stop-color="${c1}" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="customGrad2" cx="70%" cy="70%" r="65%">
            <stop offset="0%" stop-color="${c3}" stop-opacity="0.5"/>
            <stop offset="60%" stop-color="${c1}" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
          </radialGradient>
          <pattern id="dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="${c4}" opacity="0.08"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="${bg}"/>
        <rect width="100%" height="100%" fill="url(#dot-grid)"/>
        <circle cx="30%" cy="30%" r="${w*0.55}" fill="url(#customGrad1)"/>
        <circle cx="70%" cy="70%" r="${w*0.5}" fill="url(#customGrad2)"/>
        
        <!-- Elegant abstract fine art ring -->
        <circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.25}" fill="none" stroke="${c4}" stroke-opacity="0.15" stroke-width="1"/>
        <circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.25}" fill="none" stroke="${c5}" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="10, 15"/>
        
        <!-- Flowing curved lines showing structural synthesis -->
        <path d="M 0,${h*0.5} Q ${w*0.25},${h*0.2} ${w*0.5},${h*0.5} T ${w},${h*0.5}" fill="none" stroke="${c2}" stroke-width="1.5" stroke-opacity="0.5"/>
        <path d="M 0,${h*0.55} Q ${w*0.25},${h*0.25} ${w*0.5},${h*0.55} T ${w},${h*0.55}" fill="none" stroke="${c3}" stroke-width="1" stroke-opacity="0.4"/>
        
        <!-- Technical crosshairs and detail tags using user style -->
        <text x="40" y="50" font-family="monospace" font-size="10" font-weight="600" fill="${c4}" opacity="0.7" letter-spacing="2">AESTHETIC::CALIBRATED::SPEC</text>
        <text x="40" y="65" font-family="monospace" font-size="8" fill="${c5}" opacity="0.6">PALETTE: ${customColors.join(" // ")}</text>
        
        <circle cx="${w*0.5}" cy="${h*0.5}" r="6" fill="${c2}" opacity="0.8"/>
        <circle cx="${w*0.5}" cy="${h*0.5}" r="12" fill="none" stroke="${c3}" stroke-width="1" opacity="0.5"/>
      `;
    } else if (normalizedPrompt.includes("cyber") || normalizedPrompt.includes("neon") || normalizedPrompt.includes("synthwave") || normalizedPrompt.includes("retro")) {
      // Cyberpunk Theme
      bg = "#07070d";
      content = `
        <defs>
          <radialGradient id="grad1" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ff007f" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="#7a00ff" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="grad2" cx="80%" cy="70%" r="60%">
            <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00f0ff" stroke-width="0.5" stroke-opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="${bg}"/>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        <circle cx="30%" cy="30%" r="250" fill="url(#grad1)"/>
        <circle cx="80%" cy="70%" r="300" fill="url(#grad2)"/>
        
        <!-- Abstract Vector Lines -->
        <path d="M 0,${h*0.4} Q ${w*0.3},${h*0.2} ${w*0.6},${h*0.5} T ${w},${h*0.3}" fill="none" stroke="#ff007f" stroke-width="1.5" stroke-opacity="0.4"/>
        <path d="M 0,${h*0.45} Q ${w*0.3},${h*0.25} ${w*0.6},${h*0.55} T ${w},${h*0.35}" fill="none" stroke="#00f0ff" stroke-width="1" stroke-opacity="0.3"/>
        
        <!-- Technical details -->
        <text x="30" y="40" font-family="monospace" font-size="10" fill="#00f0ff" opacity="0.6">COMPUTE::SYNTHESIS::CYBER_PULSE</text>
        <text x="30" y="55" font-family="monospace" font-size="8" fill="#ff007f" opacity="0.5">ORACULAR PROTOCOL V1.2</text>
        <circle cx="${w - 40}" cy="40" r="4" fill="#ff007f"/>
        <circle cx="${w - 55}" cy="40" r="4" fill="#00f0ff" opacity="0.7"/>
      `;
    } else if (normalizedPrompt.includes("brutalist") || normalizedPrompt.includes("concrete") || normalizedPrompt.includes("stone") || normalizedPrompt.includes("basalt") || normalizedPrompt.includes("industrial") || normalizedPrompt.includes("gray") || normalizedPrompt.includes("structure")) {
      // Brutalist / Concrete Theme
      bg = "#1d1d21";
      content = `
        <defs>
          <pattern id="dot-matrix" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.08"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="${bg}"/>
        <rect width="100%" height="100%" fill="url(#dot-matrix)"/>
        
        <!-- Massive Brutalist Slabs -->
        <rect x="${w*0.15}" y="${h*0.15}" width="${w*0.5}" height="${h*0.7}" fill="#2e2f36" opacity="0.9" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.1"/>
        <rect x="${w*0.4}" y="${h*0.3}" width="${w*0.45}" height="${h*0.45}" fill="#121214" opacity="0.85" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.15"/>
        
        <!-- High Contrast Red Line / Point Accent -->
        <line x1="${w*0.1}" y1="${h*0.75}" x2="${w*0.9}" y2="${h*0.75}" stroke="#ff3b30" stroke-width="2" opacity="0.8"/>
        <circle cx="${w*0.4}" cy="${h*0.3}" r="8" fill="#ff3b30" opacity="0.9"/>
        
        <!-- Crosshairs -->
        <path d="M ${w*0.1} ${h*0.1} L ${w*0.1+15} ${h*0.1} M ${w*0.1} ${h*0.1} L ${w*0.1} ${h*0.1+15}" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
        <path d="M ${w*0.9} ${h*0.1} L ${w*0.9-15} ${h*0.1} M ${w*0.9} ${h*0.1} L ${w*0.9} ${h*0.1+15}" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
        <path d="M ${w*0.1} ${h*0.9} L ${w*0.1+15} ${h*0.9} M ${w*0.1} ${h*0.9} L ${w*0.1} ${h*0.9-15}" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
        <path d="M ${w*0.9} ${h*0.9} L ${w*0.9-15} ${h*0.9} M ${w*0.9} ${h*0.9} L ${w*0.9} ${h*0.9-15}" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
        
        <text x="${w*0.15 + 15}" y="${h*0.2 + 15}" font-family="monospace" font-size="10" fill="#ffffff" opacity="0.4">NEOLITHIC_BRUTALISM // LAYER_01</text>
        <text x="${w*0.4 + 15}" y="${h*0.3 + 30}" font-family="monospace" font-size="8" fill="#ff3b30" opacity="0.7">SCALE_FACTOR_0.842</text>
      `;
    } else if (normalizedPrompt.includes("luxury") || normalizedPrompt.includes("silk") || normalizedPrompt.includes("organza") || normalizedPrompt.includes("gold") || normalizedPrompt.includes("cream") || normalizedPrompt.includes("soft") || normalizedPrompt.includes("pink") || normalizedPrompt.includes("cloud") || normalizedPrompt.includes("calm") || normalizedPrompt.includes("ethereal")) {
      // Ethereal Luxury / Silk Theme
      bg = "#faf8f5";
      content = `
        <defs>
          <radialGradient id="champagne" cx="20%" cy="30%" r="80%">
            <stop offset="0%" stop-color="#ffe4e6" stop-opacity="0.8"/>
            <stop offset="40%" stop-color="#ffedd5" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#faf8f5" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="golden" cx="70%" cy="60%" r="70%">
            <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.7"/>
            <stop offset="60%" stop-color="#f5d0fe" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#faf8f5" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="gold-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#b45309" stop-opacity="0.1"/>
            <stop offset="50%" stop-color="#d97706" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#b45309" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="${bg}"/>
        <circle cx="20%" cy="30%" r="${w*0.6}" fill="url(#champagne)"/>
        <circle cx="70%" cy="60%" r="${w*0.7}" fill="url(#golden)"/>
        
        <!-- Flowing Organic Curves -->
        <path d="M -50,${h*0.3} C ${w*0.3},${h*0.1} ${w*0.5},${h*0.7} ${w+50},${h*0.4}" fill="none" stroke="url(#gold-line)" stroke-width="2"/>
        <path d="M -50,${h*0.35} C ${w*0.25},${h*0.15} ${w*0.55},${h*0.65} ${w+50},${h*0.45}" fill="none" stroke="#d97706" stroke-width="0.5" stroke-opacity="0.3"/>
        
        <!-- Subtle Floating Elegant Spheres -->
        <circle cx="${w*0.65}" cy="${h*0.25}" r="30" fill="#ffffff" fill-opacity="0.4" stroke="#d97706" stroke-width="0.5" stroke-opacity="0.2"/>
        <circle cx="${w*0.3}" cy="${h*0.7}" r="15" fill="#ffffff" fill-opacity="0.5" stroke="#d97706" stroke-width="0.5" stroke-opacity="0.2"/>
        
        <!-- Luxury Editorial Typography -->
        <text x="${w/2}" y="${h - 60}" font-family="Georgia, serif" font-size="14" font-weight="300" letter-spacing="6" fill="#44403c" text-anchor="middle" opacity="0.8">L'AURA SILCATE</text>
        <text x="${w/2}" y="${h - 40}" font-family="sans-serif" font-size="8" letter-spacing="3" fill="#78716c" text-anchor="middle" opacity="0.6">AESTHETIC SYNTHESIS No. 4</text>
      `;
    } else if (normalizedPrompt.includes("forest") || normalizedPrompt.includes("nature") || normalizedPrompt.includes("alpine") || normalizedPrompt.includes("green") || normalizedPrompt.includes("wood") || normalizedPrompt.includes("serene") || normalizedPrompt.includes("leaf")) {
      // Forest / Nature Theme
      bg = "#0c1512";
      content = `
        <defs>
          <radialGradient id="forestGrad" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stop-color="#14532d" stop-opacity="0.7"/>
            <stop offset="50%" stop-color="#052e16" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#0c1512" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="mist" cx="80%" cy="20%" r="50%">
            <stop offset="0%" stop-color="#0d9488" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#0c1512" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="${bg}"/>
        <circle cx="50%" cy="30%" r="${w*0.6}" fill="url(#forestGrad)"/>
        <circle cx="80%" cy="20%" r="${w*0.5}" fill="url(#mist)"/>
        
        <!-- Topographic Contour Lines -->
        <path d="M -20,${h*0.5} Q ${w*0.2},${h*0.3} ${w*0.5},${h*0.6} T ${w+20},${h*0.4}" fill="none" stroke="#22c55e" stroke-width="0.5" stroke-opacity="0.2"/>
        <path d="M -20,${h*0.55} Q ${w*0.2},${h*0.35} ${w*0.5},${h*0.65} T ${w+20},${h*0.45}" fill="none" stroke="#10b981" stroke-width="0.5" stroke-opacity="0.15"/>
        <path d="M -20,${h*0.6} Q ${w*0.2},${h*0.4} ${w*0.5},${h*0.7} T ${w+20},${h*0.5}" fill="none" stroke="#15803d" stroke-width="0.5" stroke-opacity="0.1"/>
        
        <!-- Abstract Tree Rings -->
        <circle cx="${w*0.5}" cy="${h*0.5}" r="120" fill="none" stroke="#10b981" stroke-width="0.5" stroke-dasharray="2,4" stroke-opacity="0.2"/>
        <circle cx="${w*0.5}" cy="${h*0.5}" r="80" fill="none" stroke="#10b981" stroke-width="0.5" stroke-opacity="0.15"/>
        <circle cx="${w*0.5}" cy="${h*0.5}" r="40" fill="none" stroke="#10b981" stroke-width="0.5" stroke-opacity="0.1"/>
        
        <text x="30" y="${h - 40}" font-family="monospace" font-size="9" fill="#10b981" opacity="0.5">TERRAIN_SIGNAL::SERENE_ELEVATION</text>
      `;
    } else {
      // Default Cosmic Slate Theme
      bg = "#0d0e12";
      content = `
        <defs>
          <radialGradient id="dusk1" cx="30%" cy="30%" r="75%">
            <stop offset="0%" stop-color="#312e81" stop-opacity="0.6"/>
            <stop offset="60%" stop-color="#1e1b4b" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#0d0e12" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="dusk2" cx="70%" cy="70%" r="65%">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0.35"/>
            <stop offset="50%" stop-color="#7c2d12" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#0d0e12" stop-opacity="0"/>
          </radialGradient>
          <pattern id="dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="#ffffff" opacity="0.08"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="${bg}"/>
        <rect width="100%" height="100%" fill="url(#dot-grid)"/>
        <circle cx="30%" cy="30%" r="${w*0.55}" fill="url(#dusk1)"/>
        <circle cx="70%" cy="70%" r="${w*0.5}" fill="url(#dusk2)"/>
        
        <!-- Elegant abstract fine art ring -->
        <circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.25}" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
        <circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.25}" fill="none" stroke="url(#dusk2)" stroke-opacity="0.3" stroke-width="1.5"/>
        
        <path d="M ${w*0.2} ${h*0.5} L ${w*0.8} ${h*0.5}" stroke="#ffffff" stroke-opacity="0.05" stroke-width="0.5"/>
        <path d="M ${w*0.5} ${h*0.2} L ${w*0.5} ${h*0.8}" stroke="#ffffff" stroke-opacity="0.05" stroke-width="0.5"/>
        
        <text x="40" y="${h - 40}" font-family="sans-serif" font-size="10" font-weight="300" letter-spacing="4" fill="#ffffff" opacity="0.4">MIMI SOVEREIGN ORACLE</text>
        <text x="40" y="${h - 26}" font-family="monospace" font-size="8" fill="#ea580c" opacity="0.6">COMPUTE STAGE::FALLBACK_SUCCESSFUL</text>
      `;
    }
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
    return Buffer.from(svg).toString("base64");
  }

  app.post("/api/proxy/gemini", async (req, res) => {
    try {
      const { action, params } = req.body;
      const gatewayKey = getServerAiGatewayKey();

      if (gatewayKey) {
        if (action === "generateContent") {
          const result = isGeminiImageRequest(params)
            ? await generateGeminiImageViaGateway(params, gatewayKey)
            : await generateGeminiContentViaGateway(params, gatewayKey, {
                feature: "gemini-compat-content",
              });
          return res.json(result);
        }
        if (action === "embedContent") {
          return res.json(await embedGeminiContentViaGateway(params, gatewayKey));
        }
        if (action === "generateImages") {
          return res.json(await generateGeminiImagesViaGateway(params, gatewayKey));
        }
        if (action === "generateVideos") {
          return res.json(await generateGeminiVideoViaGateway(params, gatewayKey));
        }
        if (action === "getVideosOperation") {
          const jobId = String(params?.operation?._gatewayJobId || params?._gatewayJobId || "");
          if (!jobId) {
            return res.status(400).json({
              error: { message: "Gateway video job ID is required for polling." },
            });
          }
          return res.json(await pollGatewayVideoOperation(jobId, gatewayKey));
        }
        if (action === "downloadVideo") {
          const uri = String(params?.uri || "");
          if (!uri) {
            return res.status(400).json({ error: { message: "Video download URI is required." } });
          }
          const videoResponse = await fetch(uri, {
            headers: { Authorization: `Bearer ${gatewayKey}` },
          });
          if (!videoResponse.ok) {
            return res.status(videoResponse.status).json({
              error: { message: `Gateway video download failed: ${videoResponse.statusText}` },
            });
          }
          const arrayBuffer = await videoResponse.arrayBuffer();
          return res.json({
            data: Buffer.from(arrayBuffer).toString("base64"),
            mimeType: videoResponse.headers.get("content-type") || "video/mp4",
          });
        }
        return res.status(400).json({
          error: { message: `Unsupported AI Gateway compatibility action: ${action}` },
        });
      }

      let apiKey = (req.headers['x-api-key'] as string || '').trim();
      
      if (!apiKey || apiKey === 'undefined') {
        apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      }

      if (!apiKey) {
        return res.status(400).json({ error: { message: "No valid Gemini API key found on server." } });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const tempAi = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let result;
      if (action === 'generateContent') {
        // Normalize model names to non-deprecated, correct modern ones and remove unsupported SVG data
        if (params) {
          if (params.model) {
            const reqModel = String(params.model);
            if (reqModel.includes('gemini-3.5-flash') || reqModel === 'gemini-1.5-flash' || reqModel === 'gemini-2.5-flash') {
              params.model = 'gemini-2.5-flash';
            } else if (reqModel.includes('gemini-3.1-pro-preview') || reqModel === 'gemini-1.5-pro') {
              params.model = 'gemini-3.1-pro-preview';
            } else if (reqModel.includes('gemini-3.1-flash-lite-image') || reqModel.includes('gemini-2.5-flash-image') || reqModel === 'gemini-3.1-flash-image-preview' || reqModel.includes('gemini-3.5-flash-image')) {
              params.model = 'gemini-3.1-flash-lite-image';
            } else if (reqModel.includes('gemini-3.1-flash-image') || reqModel.includes('gemini-3-pro-image')) {
              // Pass-through image models
            }
          }

          // Helper to sanitize a part
          const sanitizePart = (part: any) => {
            if (part && part.inlineData) {
              const mime = String(part.inlineData.mimeType || '').toLowerCase();
              if (mime.includes('svg') || mime.includes('xml')) {
                console.warn("MIMI // Server Proxy: Stripping unsupported SVG inlineData to prevent Gemini 400 error.");
                return { text: `[SVG Vector Graphic Reference (MIME: ${part.inlineData.mimeType})]` };
              }
            }
            return part;
          };

          // Traverse and sanitize contents
          if (params.contents) {
            if (Array.isArray(params.contents)) {
              params.contents = params.contents.map((content: any) => {
                if (content) {
                  if (Array.isArray(content.parts)) {
                    content.parts = content.parts.map(sanitizePart);
                  } else if (content.parts) {
                    content.parts = sanitizePart(content.parts);
                  } else if (Array.isArray(content)) {
                    return content.map(sanitizePart);
                  }
                }
                return content;
              });
            } else if (typeof params.contents === 'object') {
              if (Array.isArray(params.contents.parts)) {
                params.contents.parts = params.contents.parts.map(sanitizePart);
              } else if (params.contents.parts) {
                params.contents.parts = sanitizePart(params.contents.parts);
              }
            }
          }
        }

        const requestedModel = params && params.model;
        const isImageModel = String(requestedModel || '').includes('image');

        try {
          // Attempt primary call with up to 2 retries for transient 503 / high demand spikes
          let primaryAttempts = 0;
          while (primaryAttempts < 2) {
            try {
              result = await tempAi.models.generateContent(params);
              break;
            } catch (pErr: any) {
              primaryAttempts++;
              const pErrStr = String(pErr?.message || pErr);
              const isHighDemand = pErrStr.includes("503") || pErrStr.includes("UNAVAILABLE") || pErrStr.includes("high demand") || pErrStr.includes("overloaded");
              if (isHighDemand && primaryAttempts < 2) {
                console.warn(`MIMI // Server Proxy: Primary model (${params?.model}) high demand 503 error. Retrying in 800ms (attempt ${primaryAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 800));
              } else {
                throw pErr;
              }
            }
          }
        } catch (genErr: any) {
          if (isImageModel) {
            console.warn("MIMI // Server Proxy: Primary image generation failed. Attempting to build procedural artwork fallback...", genErr.message || genErr);
            
            let promptText = "Abstract Design";
            if (params && params.contents) {
              let parts = params.contents.parts;
              if (!parts && Array.isArray(params.contents)) {
                parts = params.contents;
              }
              if (parts && parts[0]) {
                promptText = parts[0].text || "Abstract Design";
              } else if (typeof params.contents === "string") {
                promptText = params.contents;
              }
            }
            
            const ar = (params && params.config && params.config.imageConfig && params.config.imageConfig.aspectRatio) || "1:1";
            const svgBase64 = generateProceduralSVG(promptText, ar);
            
            return res.json({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        inlineData: {
                          mimeType: "image/svg+xml",
                          data: svgBase64
                        }
                      }
                    ]
                  },
                  finishReason: "STOP"
                }
              ]
            });
          }

          const errStr = String(genErr?.message || genErr);
          const isFallbackTrigger = true; // Always attempt fallback chain for any model error on server
          
          if (isFallbackTrigger && params) {
            const fallbackChain = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"];
            
            let lastError = genErr;
            let fallbackSucceeded = false;
            
            for (const fallbackModel of fallbackChain) {
              if (fallbackModel !== requestedModel) {
                try {
                  console.warn(`MIMI // Server Proxy: falling back to ${fallbackModel} due to error on ${requestedModel || "default"}:`, genErr.message || genErr);
                  const fallbackParams = JSON.parse(JSON.stringify(params));
                  fallbackParams.model = fallbackModel;
                  
                  // Strip thinkingConfig for non-pro models to prevent invalid parameter errors
                  if (fallbackParams.config && !fallbackModel.includes('pro')) {
                    delete fallbackParams.config.thinkingConfig;
                  }
                  
                  result = await tempAi.models.generateContent(fallbackParams);
                  fallbackSucceeded = true;
                  break;
                } catch (fallbackErr: any) {
                  console.error(`MIMI // Server Proxy: fallback to ${fallbackModel} failed as well:`, fallbackErr.message || fallbackErr);
                  lastError = fallbackErr;
                }
              }
            }
            if (!fallbackSucceeded) {
              throw lastError;
            }
          } else {
            throw genErr;
          }
        }
        const textValue = result.text;
        const serialized = {
          ...result,
          text: textValue
        };
        return res.json(serialized);
      } else if (action === 'embedContent') {
        result = await tempAi.models.embedContent(params);
        return res.json(result);
      } else if (action === 'generateImages') {
        result = await tempAi.models.generateImages(params);
        return res.json(result);
      } else if (action === 'generateVideos') {
        result = await tempAi.models.generateVideos(params);
        return res.json(result);
      } else if (action === 'getVideosOperation') {
        result = await tempAi.operations.getVideosOperation(params);
        return res.json(result);
      } else if (action === 'downloadVideo') {
        const uri = String(params?.uri || '');
        if (!uri) {
          return res.status(400).json({ error: { message: "Video download URI is required." } });
        }
        const videoResponse = await fetch(uri, {
          headers: { 'x-goog-api-key': apiKey },
        });
        if (!videoResponse.ok) {
          return res.status(videoResponse.status).json({
            error: { message: `Video download failed: ${videoResponse.statusText}` },
          });
        }
        const arrayBuffer = await videoResponse.arrayBuffer();
        return res.json({
          data: Buffer.from(arrayBuffer).toString('base64'),
          mimeType: videoResponse.headers.get('content-type') || 'video/mp4',
        });
      } else {
        return res.status(400).json({ error: { message: `Unsupported action: ${action}` } });
      }
    } catch (e: any) {
      console.error("MIMI // Gemini Proxy Error:", e);
      const errorMsg = e.message || "";
      let errorStr = "";
      try {
        errorStr = typeof e === 'object' ? JSON.stringify(e) : String(e);
      } catch (jsonErr) {
        errorStr = String(e);
      }
      
      const isServiceBlocked = errorStr.includes("API_KEY_SERVICE_BLOCKED") || 
                               errorStr.includes("generativelanguage.googleapis.com") || 
                               errorStr.includes("blocked") ||
                               errorMsg.includes("blocked") ||
                               errorMsg.includes("PERMISSION_DENIED") ||
                               errorMsg.includes("API_KEY_SERVICE_BLOCKED");
      
      const isCreditsDepleted = errorStr.includes("RESOURCE_EXHAUSTED") ||
                                errorStr.includes("prepayment credits") ||
                                errorStr.includes("depleted") ||
                                errorMsg.includes("credits") ||
                                errorMsg.includes("RESOURCE_EXHAUSTED");

      let message = errorMsg || "Internal server error during Gemini invocation";
      let fallbackStatus = e.status || undefined;
      let fallbackCode = e.code || undefined;

      if (isServiceBlocked) {
        message = "MIMI // Oracle Status: Service Blocked. The default server-side Gemini API Key is restricted in the Google Cloud Platform (GCP) project. Code: API_KEY_SERVICE_BLOCKED. TO RESOLVE: (1) Go to your GCP Console > 'APIs & Services' > 'Credentials', edit your active API key restrictions, and check 'Generative Language API' (generativelanguage.googleapis.com) to allow Gemini calls. OR (2) Navigate to Settings/Profile in the app, unlock the Sovereign Keychain, and input your own unrestricted Gemini API Key (Bring Your Own Key mode) to override the server defaults.";
        fallbackStatus = "PERMISSION_DENIED";
        fallbackCode = 403;
      } else if (isCreditsDepleted) {
        message = "MIMI // Oracle Status: Prepayment Credits Depleted. The backend Gemini API key project has run out of credits or depleted its prepayment limits (RESOURCE_EXHAUSTED). TO RESOLVE: (1) Go to your Google AI Studio at https://ai.studio/projects to check/refill prepay credits or billing for the associated project. OR (2) Navigate to Settings/Profile, open the Sovereign Keychain, and input your own personal unrestricted Gemini API Key (Bring Your Own Key mode) to bypass this server-side block.";
        fallbackStatus = "RESOURCE_EXHAUSTED";
        fallbackCode = 429;
      }

      // Safely calculate status code to be a number (NOT a string like 'PERMISSION_DENIED' which crashes Express)
      let finalStatusCode = 500;
      if (typeof fallbackCode === 'number' && fallbackCode >= 100 && fallbackCode < 600) {
        finalStatusCode = fallbackCode;
      } else if (typeof e.code === 'number' && e.code >= 100 && e.code < 600) {
        finalStatusCode = e.code;
      } else if (typeof e.status === 'number' && e.status >= 100 && e.status < 600) {
        finalStatusCode = e.status;
      } else if (isServiceBlocked) {
        finalStatusCode = 403;
      } else if (isCreditsDepleted) {
        finalStatusCode = 429;
      }

      return res.status(finalStatusCode).json({ 
        error: { 
          message,
          status: fallbackStatus,
          code: fallbackCode
        } 
      });
    }
  });

  // API Routes
  app.get("/api/health", async (req, res) => {
    const serverAiEnabled =
      process.env.MIMI_ENABLE_SERVER_AI === "true" ||
      process.env.MIMI_ENABLE_SERVER_AI === "1";

    res.json({
      status: "ok",
      service: "mimi",
      ai: {
        serverAiEnabled,
        defaultProvider: getServerAiGatewayKey() ? "gateway" : "legacy",
        openai: serverAiEnabled && Boolean(process.env.OPENAI_API_KEY),
        gemini: serverAiEnabled && Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
        anthropic: serverAiEnabled && Boolean(process.env.ANTHROPIC_API_KEY),
        openrouter: serverAiEnabled && Boolean(process.env.OPENROUTER_API_KEY),
        aiGateway: serverAiEnabled && Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
        replicate: serverAiEnabled && Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      },
      sovereign: await sovereignStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // Sovereign archive — owned SQLite data plane (Floor / public reads without Firestore)
  app.get("/api/sovereign/status", async (req, res) => {
    await sovereignStatusHandler(req, res);
  });
  app.get("/api/sovereign/ping", async (req, res) => {
    await sovereignPingHandler(req, res);
  });
  app.get("/api/sovereign/community", async (req, res) => {
    await sovereignCommunityHandler(req, res);
  });
  app.get("/api/sovereign/zines/:id", async (req, res) => {
    await sovereignZineHandler(req, res);
  });
  app.post("/api/sovereign/zines", async (req, res) => {
    await sovereignZineHandler(req, res);
  });
  app.delete("/api/sovereign/zines/:id", async (req, res) => {
    await sovereignZineHandler(req, res);
  });
  app.get("/api/sovereign/zines", async (req, res) => {
    await sovereignZineHandler(req, res);
  });
  app.get("/api/sovereign/profile", async (req, res) => {
    await sovereignProfileHandler(req, res);
  });
  app.post("/api/sovereign/profile", async (req, res) => {
    await sovereignProfileHandler(req, res);
  });
  app.get("/api/sovereign/pocket", async (req, res) => {
    await sovereignPocketHandler(req, res);
  });
  app.post("/api/sovereign/pocket", async (req, res) => {
    await sovereignPocketHandler(req, res);
  });
  app.delete("/api/sovereign/pocket", async (req, res) => {
    await sovereignPocketHandler(req, res);
  });
  app.post("/api/sovereign/import", async (req, res) => {
    await sovereignImportHandler(req, res);
  });
  app.post("/api/sovereign/reindex", async (req, res) => {
    await sovereignReindexHandler(req, res);
  });
  app.get("/api/sovereign/events", async (req, res) => {
    await sovereignEventsHandler(req, res);
  });

  app.get("/api/heartbeat", (_req, res) => {
    res.json({
      status: "ok",
      type: "LATENCY_METRICS",
      timestamp: Date.now(),
      metrics: {
        gemini: 110 + Math.floor(Math.random() * 30),
        openai: 220 + Math.floor(Math.random() * 50),
        anthropic: 170 + Math.floor(Math.random() * 40)
      }
    });
  });

  app.post("/api/batch-pdf", (req, res) => {
    try {
      const { treatments } = req.body;
      if (!treatments || !Array.isArray(treatments) || treatments.length === 0) {
        return res.status(400).json({ error: "No treatments provided for PDF compilation." });
      }

      function hexToRgb(hexStr: string): { r: number; g: number; b: number } | null {
        const cleanHex = hexStr.trim();
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Cover Page
      doc.setFillColor(18, 18, 20); // Dark theme cover page!
      doc.rect(0, 0, 210, 297, "F");

      // Grid/Dots decoration
      doc.setDrawColor(38, 38, 38);
      doc.setLineWidth(0.15);
      for (let i = 20; i < 210; i += 20) {
        doc.line(i, 0, i, 297);
      }
      for (let j = 20; j < 297; j += 20) {
        doc.line(0, j, 210, j);
      }

      // Large Title
      doc.setTextColor(250, 249, 246); // Off white
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("MIMI SCRIBE", 25, 80);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(245, 158, 11); // Amber accent
      doc.text("Editorial Style Treatments Compilation", 25, 95);

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(1);
      doc.line(25, 105, 185, 105);

      // Metadata Info
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(163, 163, 163); // Gray
      doc.text(`DATE GENERATED : ${new Date().toLocaleDateString()}`, 25, 125);
      doc.text(`TOTAL SPECIMENS: ${treatments.length} bespoke entries`, 25, 135);

      // Collect unique tags
      const allTags = treatments.flatMap((t: any) => t.tags || []);
      const uniqueTags = Array.from(new Set(allTags));
      if (uniqueTags.length > 0) {
        const tagsStr = uniqueTags.slice(0, 8).join(", ");
        const tagsLine = `TAGS EXPLORED  : ${tagsStr}${uniqueTags.length > 8 ? "..." : ""}`;
        doc.text(tagsLine, 25, 145);
      }

      // Elegant Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text("CONSTRUCTED VIA MIMI SOVEREIGN ORACLE WORKSPACE", 105, 275, { align: "center" });

      // Pages for individual treatments
      treatments.forEach((t: any, index: number) => {
        doc.addPage();
        
        // Use clean off-white background for editorial pages (Aesthetic)
        doc.setFillColor(250, 249, 246);
        doc.rect(0, 0, 210, 297, "F");

        // Header
        doc.setFont("courier", "bold");
        doc.setFontSize(8);
        doc.setTextColor(120, 113, 108);
        doc.text("MIMI SCRIBE // STYLE REGISTER", 20, 18);
        doc.text(`SPECIMEN NO. ${String(index + 1).padStart(2, "0")}`, 190, 18, { align: "right" });

        // Header Line
        doc.setDrawColor(214, 211, 209);
        doc.setLineWidth(0.3);
        doc.line(20, 21, 190, 21);

        // Treatment Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(28, 25, 23);
        const nameUpper = (t.treatmentName || "UNTITLED SPECIMEN").toUpperCase();
        doc.text(nameUpper, 20, 35);

        // Tags
        if (t.tags && t.tags.length > 0) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(120, 113, 108);
          doc.text(`Tags: ${t.tags.map((tag: string) => `#${tag}`).join(", ")}`, 20, 43);
        }

        // Section: Aesthetic Profile Parameters
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(120, 113, 108);
        doc.text("CANONICAL PARAMETERS", 20, 58);
        doc.line(20, 60, 190, 60);

        const taste = t.canonicalTaste || {};
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(68, 64, 60);

        let paramY = 67;
        const motifsStr = (taste.motifs && taste.motifs.length > 0) ? taste.motifs.join(", ") : "None specified";
        const moodStr = (taste.mood && taste.mood.length > 0) ? taste.mood.join(", ") : "None specified";
        const densityVal = taste.density !== undefined ? Number(taste.density).toFixed(2) : "0.50";
        const entropyVal = taste.entropy !== undefined ? Number(taste.entropy).toFixed(2) : "0.50";

        doc.text(`Motifs:  ${motifsStr}`, 20, paramY);
        paramY += 6;
        doc.text(`Moods:   ${moodStr}`, 20, paramY);
        paramY += 6;
        doc.text(`Density: ${densityVal} // Entropy: ${entropyVal}`, 20, paramY);

        // Section: Palette Blocks
        const palette = taste.palette || [];
        if (palette.length > 0) {
          const paletteY = paramY + 12;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(120, 113, 108);
          doc.text("AESTHETIC COLOR PALETTE", 20, paletteY);
          doc.line(20, paletteY + 2, 190, paletteY + 2);

          const tileW = 20;
          const tileH = 12;
          const tileGap = 4;
          let tileX = 20;
          const tileY = paletteY + 6;

          palette.forEach((color: string) => {
            // Set color
            try {
              const rgb = hexToRgb(color);
              if (rgb) {
                doc.setFillColor(rgb.r, rgb.g, rgb.b);
              } else {
                doc.setFillColor(200, 200, 200);
              }
              doc.rect(tileX, tileY, tileW, tileH, "F");
              
              // Thin border around the rectangle
              doc.setDrawColor(214, 211, 209);
              doc.setLineWidth(0.1);
              doc.rect(tileX, tileY, tileW, tileH, "S");

              // Label below tile
              doc.setFont("courier", "normal");
              doc.setFontSize(7);
              doc.setTextColor(120, 113, 108);
              doc.text(color.toUpperCase(), tileX, tileY + tileH + 4);
            } catch (err) {
              // fallback if color is invalid hex
            }
            tileX += tileW + tileGap;
          });

          paramY = tileY + tileH + 16;
        } else {
          paramY += 12;
        }

        // Section: Directives / Instructions
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(120, 113, 108);
        doc.text("EDITORIAL COMPOSITION DIRECTIVES", 20, paramY);
        doc.line(20, paramY + 2, 190, paramY + 2);

        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(41, 37, 36);

        const directiveText = t.instruction || "No composition instructions registered for this specimen.";
        const splitText = doc.splitTextToSize(directiveText, 170);
        doc.text(splitText, 20, paramY + 9);

        // Footer
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(168, 162, 158);
        doc.text(`Page ${index + 2} of ${treatments.length + 1}`, 190, 280, { align: "right" });
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="mimi_style_treatments_compilation.pdf"`);
      res.send(pdfBuffer);

    } catch (err: any) {
      console.error("MIMI // Failed to generate PDF:", err);
      res.status(500).json({ error: "Failed to compile style treatments into PDF: " + err.message });
    }
  });

  app.post("/api/sessionLogin", async (req, res) => {
    const idToken = req.body?.idToken;
    if (!idToken) {
      return res.status(400).json({ error: "idToken is required." });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const proxied = await proxySessionLogin({ idToken });
        if (proxied.setCookie) {
          res.setHeader("Set-Cookie", proxied.setCookie);
        }
        return res.status(proxied.status).json(proxied.payload);
      } catch (error) {
        console.error("MIMI // sessionLogin proxy failed:", error);
        return res.status(503).json({ error: "Session login unavailable." });
      }
    }

    try {
      const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_MS });
      res.setHeader("Set-Cookie", buildSessionCookieHeader(sessionCookie));
      res.status(200).json({ status: "success" });
    } catch (error) {
      console.error("MIMI // sessionLogin failed:", error);
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  app.post("/api/sessionLogout", (_req, res) => {
    res.setHeader("Set-Cookie", clearSessionCookieHeader());
    res.status(200).json({ status: "success" });
  });

  app.post("/api/ingest-client", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let pageTitle = "Unknown Brand";
    let description = "";
    const imageUrls: string[] = [];

    try {
      // 1. Scrape URL with axios & cheerio
      const response = await axios.get(url, { 
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        },
        timeout: 10000 
      });
      const $ = cheerio.load(response.data);

      pageTitle = $("title").text() || $('meta[property="og:title"]').attr("content") || "";
      description = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
      
      $("img").slice(0, 8).each((i, el) => {
        const src = $(el).attr("src");
        if (src) {
          try {
            const absoluteUrl = new URL(src, url).toString();
            if (absoluteUrl.startsWith("http")) {
              imageUrls.push(absoluteUrl);
            }
          } catch (e) {
            // ignore malformed URLs
          }
        }
      });
    } catch (scrapeError: any) {
      console.warn("MIMI // Client scraper failed or timed out. Falling back to semantic inference based on domain.", scrapeError.message);
      try {
        const parsedUrl = new URL(url);
        const domainParts = parsedUrl.hostname.split(".");
        const brandName = domainParts[domainParts.length - 2] || parsedUrl.hostname;
        pageTitle = brandName.charAt(0).toUpperCase() + brandName.slice(1);
        description = `Dynamic aesthetic profile inferred from URI catalog workspace: ${url}.`;
      } catch (err) {
        pageTitle = "Aesthetic Client Profile";
        description = `Strategic refraction mapping for requested URL: ${url}.`;
      }
    }

    try {
      const gatewayKey = getServerAiGatewayKey();
      if (!gatewayKey) {
        return res.status(400).json({ error: "No AI Gateway key available on the server for client profiling." });
      }

      const aiPrompt = `
        You are Mimi Scribe's Sovereign Aesthetic Oracle. Analyze the following scraped metadata for a client website:
        Target URL: "${url}"
        Page Title: "${pageTitle.trim()}"
        Description: "${description.trim()}"
        Associated Images: ${JSON.stringify(imageUrls.slice(0, 5))}

        Generate a cohesive, highly tailored brand positioning and product strategy memo in raw JSON format. Match the following structure exactly:
        {
          "clientName": "The Brand Name",
          "tagline": "A high-concept, uppercase editorial tagline summarizing their aesthetic vibe",
          "wedgeFocus": 85,
          "editorialOrthodoxy": 75,
          "dataSovereignty": true,
          "thesis": {
            "chapter": "CHAPTER I // CONCEPT DEFINITION",
            "title": "Editorial title for their primary positioning",
            "summary1": "Strategic paragraph explaining why this brand needs a specific digital-physical wedge rather than generic channels.",
            "summary2": "Technical paragraph mapping how their current audience aligns with advanced curation workflows.",
            "bullets": [
              "Coherent positioning tenet 1",
              "Coherent positioning tenet 2",
              "Coherent positioning tenet 3"
            ]
          },
          "wedge": {
            "title": "Aesthetic title of their specialized tooling gate (e.g. Virtual Closet, Archival Lookbook)",
            "summary": "Detailed explanation of their immediate wedge product and why it attracts high-value patrons."
          },
          "technical": {
            "pipelineName": "PROCESS BLOCK MODEL NAME",
            "step1": "Input data sources analyzed",
            "step2": "AI latent representation style",
            "step3": "System output and client reports"
          },
          "monetization": {
            "tier1Title": "Entry Level subscription name",
            "tier1Description": "What it unlocks and cost per month",
            "tier2Title": "Enterprise / Patron level name",
            "tier2Description": "What it unlocks and cost per month"
          },
          "roadmap": [
            { "id": "step1", "title": "First critical step", "description": "Details of action 1", "checked": true },
            { "id": "step2", "title": "Second critical step", "description": "Details of action 2", "checked": false },
            { "id": "step3", "title": "Third critical step", "description": "Details of action 3", "checked": false },
            { "id": "step4", "title": "Fourth critical step", "description": "Details of action 4", "checked": false },
            { "id": "step5", "title": "Fifth critical step", "description": "Details of action 5", "checked": false }
          ]
        }
      `;

      const aiResponse = await generateGeminiContentViaGateway({
        contents: aiPrompt,
        config: { 
          responseMimeType: "application/json"
        }
      }, gatewayKey, { feature: "ingest-client" });

      const responseText = aiResponse.text;
      if (!responseText) {
        throw new Error("No response from taste graph reasoning model.");
      }

      const parsedData = JSON.parse(responseText.trim());
      return res.json(parsedData);

    } catch (error: any) {
      console.error("MIMI // Aesthetic Ingestion Error:", error);
      return res.status(500).json({ error: error.message || "Failed to compile brand aesthetic profile using the taste graph reasoning model." });
    }
  });

  app.post("/api/you-search", async (req, res) => {
    await youSearchHandler(req, res);
  });

  app.post("/api/forecast", async (req, res) => {
    await forecastHandler(req, res);
  });

  app.post("/api/celestial/geocode", async (req, res) => {
    await celestialGeocodeHandler(req, res);
  });

  app.post("/api/celestial/geocode-suggest", async (req, res) => {
    await celestialGeocodeSuggestHandler(req, res);
  });

  app.get("/api/residue-acquire", async (req, res) => {
    await residueAcquireHandler(req, res);
  });

  app.post("/api/residue-acquire", async (req, res) => {
    await residueAcquireHandler(req, res);
  });

  app.get("/api/collective/mmm-report", async (req, res) => {
    await collectiveMmmReportHandler(req, res);
  });

  app.post("/api/live/token", async (req, res) => {
    try {
      await liveTokenHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/live/token:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    await createCheckoutSessionHandler(req, res);
  });

  app.post("/api/create-billing-portal-session", async (req, res) => {
    await createBillingPortalSessionHandler(req, res);
  });

  app.post("/api/apply-promo", async (req, res) => {
    await applyPromoHandler(req, res);
  });

  app.get("/api/shopify/connection", async (req, res) => {
    try {
      await verifyMimiSession(req.headers);
      return res.json(getShopifyConnectionStatus());
    } catch (error: any) {
      return res.status(Number(error?.status) || 500).json({
        error: error?.message || "Shopify connection status unavailable.",
        code: error?.code || "SHOPIFY_CONNECTION_STATUS_FAILED",
      });
    }
  });

  app.post("/api/shopify/publish-product", async (req, res) => {
    try {
      await verifyMimiSession(req.headers);
      if (req.body?.confirmed !== true) {
        return res.status(400).json({
          error: "Explicit draft-publication confirmation is required.",
          code: "SHOPIFY_CONFIRMATION_REQUIRED",
        });
      }

      return res.json(await publishShopifyDraft(req.body?.product));
    } catch (error: any) {
      console.error("MIMI // Shopify draft publish failed:", {
        code: error?.code,
        message: error?.message,
      });
      return res.status(Number(error?.status) || 500).json({
        error: error?.message || "Shopify draft publish failed.",
        code: error?.code || "SHOPIFY_PUBLISH_FAILED",
      });
    }
  });

  app.post("/api/shopify/catalog-search", async (req, res) => {
    try {
      await verifyMimiSession(req.headers);
      const agentProfileUrl = process.env.SHOPIFY_UCP_AGENT_PROFILE || "";
      if (!agentProfileUrl) {
        return res.status(503).json({
          error: "Shopify discovery is not configured. Set SHOPIFY_UCP_AGENT_PROFILE.",
          code: "SHOPIFY_CATALOG_NOT_CONFIGURED",
        });
      }

      return res.json(
        await searchShopifyGlobalCatalog({
          query: String(req.body?.query || ""),
          intent: typeof req.body?.intent === "string" ? req.body.intent : undefined,
          country: typeof req.body?.country === "string" ? req.body.country : "US",
          limit: Number(req.body?.limit) || 8,
          agentProfileUrl,
        }),
      );
    } catch (error: any) {
      return res.status(Number(error?.status) || 500).json({
        error: error?.message || "Shopify catalog search failed.",
        code: error?.code || "SHOPIFY_CATALOG_SEARCH_FAILED",
      });
    }
  });

  app.get("/api/metadata", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch URL" });
      }

      const html = await response.text();
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
      const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';

      res.json({ title, description, image, url });
    } catch (error: any) {
      console.error("MIMI // Metadata Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pinterest", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "Pinterest URL required" });
      }
      res.json(await fetchPinterestBoardPreview(url));
    } catch (error: any) {
      const message = error?.message || String(error);
      const clientError =
        /Pinterest URL|valid Pinterest|Only pinterest|public thumbnails|public board/i.test(
          message,
        );
      console.error("MIMI // Pinterest public preview error:", message);
      res.status(clientError ? 400 : 502).json({ error: message });
    }
  });

  app.get("/api/inspo/search", async (req, res) => {
    try {
      const { handleInspoSearchRoute } = await import("./lib/inspoSearchRoute.js");
      await handleInspoSearchRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Inspo search error:", error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  app.get("/api/letterboxd", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "Letterboxd username or URL required" });
      }
      res.json(await fetchLetterboxdFeed(url));
    } catch (error: any) {
      const message = error?.message || String(error);
      const clientError =
        /Letterboxd URL|valid Letterboxd|Only letterboxd|public feed|username|readable diary|profile or RSS|HTTP or HTTPS/i.test(
          message,
        );
      console.error("MIMI // Letterboxd feed error:", message);
      res.status(clientError ? 400 : 502).json({ error: message });
    }
  });

  // Keep Tabs — creator public-issue RSS (also served at /u/:handle/feed.xml)
  app.get("/api/feed", async (req, res) => {
    await handleCreatorFeedRequest(req, res);
  });
  app.get("/api/feed/:handle", async (req, res) => {
    await handleCreatorFeedRequest(req, res);
  });
  app.get("/u/:handle/feed.xml", async (req, res) => {
    await handleCreatorFeedRequest(req, res);
  });

  app.get("/api/proxy-image", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).send("URL required");
      
      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).send("Failed to fetch image");
      
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/mimi-image", async (req, res) => {
    try {
      await mimiImageHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi-image:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/generate-text", async (req, res) => {
    try {
      await generateTextHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/generate-text:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/embed", async (req, res) => {
    try {
      await embedHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/embed:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/create-zine", async (req, res) => {
    try {
      await createZineHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/create-zine:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/analyze-image", async (req, res) => {
    try {
      await analyzeImageHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/analyze-image:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/analyze-signals", async (req, res) => {
    try {
      await analyzeSignalsHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/analyze-signals:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/generate-spec", async (req, res) => {
    try {
      await generateSpecHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/generate-spec:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/generate-image", async (req, res) => {
    try {
      await generateImageHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/generate-image:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/synthesize-dossier", async (req, res) => {
    try {
      await synthesizeDossierHandler(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/synthesize-dossier:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/evidence", async (req, res) => {
    try {
      await handleMimiEvidenceRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/evidence:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.post("/api/mimi/evidence/analyze", async (req, res) => {
    try {
      await handleMimiEvidenceAnalyzeRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/evidence/analyze:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.get("/api/mimi/taste-state", async (req, res) => {
    try {
      await handleMimiTasteStateRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/taste-state:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.get("/api/mimi/taste-graph/summary", async (req, res) => {
    try {
      await handleMimiTasteGraphSummaryRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/taste-graph/summary:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.get("/api/mimi/used-context", async (req, res) => {
    try {
      await handleMimiUsedContextGetRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in /api/mimi/used-context:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  app.put("/api/mimi/used-context", async (req, res) => {
    try {
      await handleMimiUsedContextPutRoute(req, res);
    } catch (error: any) {
      console.error("MIMI // Route error in PUT /api/mimi/used-context:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: error.message || "Internal server error" } });
      }
    }
  });

  // Dynamic Server-Side SEO Caching and Retrieval for Shared Zines
  async function fetchZineMetadataServerSide(zineId: string): Promise<{ title?: string; concept?: string; coverImageUrl?: string; userHandle?: string } | null> {
    // 1. Try Firebase Admin SDK if db is initialized
    if (db) {
      try {
        const docRef = db.collection("zines").doc(zineId);
        const snap = await docRef.get();
        if (snap.exists) {
          const data = snap.data();
          if (data) {
            let coverImg = data.coverImageUrl;
            if (!coverImg && data.contentImages && Array.isArray(data.contentImages) && data.contentImages.length > 0) {
              coverImg = data.contentImages[0];
            }
            let conceptText = data.concept || data.originalInput || "";
            if (!conceptText && data.content && data.content.meta && data.content.meta.intent) {
              conceptText = data.content.meta.intent;
            }
            return {
              title: data.title,
              concept: conceptText,
              coverImageUrl: coverImg,
              userHandle: data.userHandle || "Curator"
            };
          }
        }
      } catch (e) {
        console.warn("MIMI // Admin SDK zine fetch failed, trying REST API:", e);
      }
    }

    // 2. Fallback to Firestore REST API
    try {
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(firebaseConfigPath)) {
        const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
        const projectId = config.projectId;
        const databaseId = config.firestoreDatabaseId || '(default)';
        
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/zines/${zineId}`;
        const response = await axios.get(url, { timeout: 4000 });
        if (response.status === 200 && response.data?.fields) {
          const fields = response.data.fields;
          
          const getStringValue = (field: any) => {
            if (!field) return undefined;
            return field.stringValue || undefined;
          };
          
          let coverImageUrl = getStringValue(fields.coverImageUrl);
          if (!coverImageUrl && fields.contentImages?.arrayValue?.values) {
            const firstVal = fields.contentImages.arrayValue.values[0];
            if (firstVal && firstVal.stringValue) {
              coverImageUrl = firstVal.stringValue;
            }
          }
          
          let concept = getStringValue(fields.concept) || getStringValue(fields.originalInput) || "";
          if (!concept && fields.content?.mapValue?.fields?.meta?.mapValue?.fields?.intent?.stringValue) {
            concept = fields.content.mapValue.fields.meta.mapValue.fields.intent.stringValue;
          }

          return {
            title: getStringValue(fields.title),
            concept,
            coverImageUrl,
            userHandle: getStringValue(fields.userHandle)
          };
        }
      }
    } catch (e) {
      console.warn("MIMI // REST API zine fetch failed:", e);
    }

    return null;
  }

  async function fetchProfileServerSide(handle: string): Promise<Record<string, unknown> | null> {
    const normalized = normalizeFeedHandle(handle);
    if (!normalized) return null;

    try {
      const sovereign = await getProfileByHandle(normalized);
      if (sovereign) return sovereign as unknown as Record<string, unknown>;
    } catch (e) {
      console.warn("MIMI // Sovereign profile fetch failed:", e);
    }

    if (db) {
      try {
        const snap = await db.collection("profiles_public").where("handle", "==", normalized).limit(1).get();
        if (!snap.empty) return snap.docs[0].data() || null;
      } catch (e) {
        console.warn("MIMI // Admin SDK profile fetch failed:", e);
      }
    }

    return null;
  }

  function replaceMeta(html: string, propertyValue: string, contentValue: string, isProperty: boolean): string {
    const attr = isProperty ? 'property' : 'name';
    const regex = new RegExp(`<meta\\s+[^>]*?${attr}="${propertyValue}"[^>]*?>`, 'i');
    const cleanContent = contentValue ? contentValue.replace(/"/g, '&quot;') : '';
    const newTag = `<meta ${attr}="${propertyValue}" content="${cleanContent}" />`;
    
    if (regex.test(html)) {
      return html.replace(regex, newTag);
    }
    
    const altAttr = isProperty ? 'name' : 'property';
    const altRegex = new RegExp(`<meta\\s+[^>]*?${altAttr}="${propertyValue}"[^>]*?>`, 'i');
    if (altRegex.test(html)) {
      return html.replace(altRegex, newTag);
    }
    
    return html.replace('<head>', `<head>\n    ${newTag}`);
  }

  function injectZineSEOMetadata(html: string, zine: { title: string; concept: string; coverImageUrl: string; userHandle: string }, pageUrl: string): string {
    let modifiedHtml = html;
    
    const title = `${zine.title} | Mimi`;
    modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);
    
    modifiedHtml = replaceMeta(modifiedHtml, 'description', zine.concept, false);
    
    modifiedHtml = replaceMeta(modifiedHtml, 'og:title', zine.title, true);
    modifiedHtml = replaceMeta(modifiedHtml, 'og:description', zine.concept, true);
    modifiedHtml = replaceMeta(modifiedHtml, 'og:image', zine.coverImageUrl, true);
    modifiedHtml = replaceMeta(modifiedHtml, 'og:url', pageUrl, true);
    modifiedHtml = replaceMeta(modifiedHtml, 'og:type', 'article', true);
    
    modifiedHtml = replaceMeta(modifiedHtml, 'twitter:card', 'summary_large_image', false);
    modifiedHtml = replaceMeta(modifiedHtml, 'twitter:title', zine.title, false);
    modifiedHtml = replaceMeta(modifiedHtml, 'twitter:description', zine.concept, false);
    modifiedHtml = replaceMeta(modifiedHtml, 'twitter:image', zine.coverImageUrl, false);
    modifiedHtml = replaceMeta(modifiedHtml, 'twitter:url', pageUrl, false);
    
    return modifiedHtml;
  }

  async function fetchPublicProfileByHandleServer(
    handle: string,
  ): Promise<Record<string, unknown> | null> {
    const normalized = String(handle || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    if (!normalized || !db) return null;
    try {
      const snap = await db
        .collection("profiles_public")
        .where("handle", "==", normalized)
        .limit(1)
        .get();
      if (snap.empty) return null;
      return snap.docs[0].data() as Record<string, unknown>;
    } catch (e) {
      console.warn("MIMI // Server profile fetch failed:", e);
      return null;
    }
  }

  app.get("/u/:handle/signature", async (req, res) => {
    try {
      const handle = String(req.params.handle || "").trim();
      console.log(`MIMI // Server-side SEO requested for public signature: @${handle}`);

      let htmlPath = "";
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        htmlPath = path.join(process.cwd(), "index.html");
      } else {
        htmlPath = path.join(process.cwd(), "dist", "index.html");
      }

      if (!fs.existsSync(htmlPath)) {
        return res.status(404).send("Index template not found");
      }

      let html = fs.readFileSync(htmlPath, "utf8");
      const profile = await fetchPublicProfileByHandleServer(handle);
      const { extractPublishedPublicSignature, buildPublicSignatureSeo, injectSignatureSeoIntoIndexHtml } =
        await import("./lib/signature/publicSignature.js");
      const signature = extractPublishedPublicSignature(profile);
      const showcase = (profile?.publicShowcase || {}) as Record<string, unknown>;
      const pageUrl = `https://${req.get("host")}/u/${handle.toLowerCase()}/signature`;
      const seo = buildPublicSignatureSeo(handle, signature, {
        baseUrl: `https://${req.get("host")}`,
        imageFallback:
          typeof showcase.dollPortraitUrl === "string" ? showcase.dollPortraitUrl : undefined,
      });
      html = injectSignatureSeoIntoIndexHtml(html, { ...seo, pageUrl });

      if (process.env.NODE_ENV !== "production" && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err: unknown) {
      console.error("MIMI // Error generating signature SEO:", err);
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        res.sendFile(path.join(process.cwd(), "index.html"));
      } else {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      }
    }
  });

  // Intercept shared zines routes to provide native platform preview support (rich Open Graph card previews)
  app.get("/s/:zineId", async (req, res) => {
    try {
      const zineId = req.params.zineId;
      console.log(`MIMI // Server-side SEO requested for shared zine: ${zineId}`);
      
      const zine = await fetchZineMetadataServerSide(zineId);
      
      let htmlPath = "";
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        htmlPath = path.join(process.cwd(), 'index.html');
      } else {
        htmlPath = path.join(process.cwd(), 'dist', 'index.html');
      }
      
      if (!fs.existsSync(htmlPath)) {
        return res.status(404).send("Index template not found");
      }
      
      let html = fs.readFileSync(htmlPath, 'utf8');
      
      if (zine) {
        const pageUrl = `https://${req.get('host')}/s/${zineId}`;
        const zineSEO = {
          title: zine.title || "Untitled Manifestation",
          concept: zine.concept || "Aesthetic Zine created via Mimi",
          coverImageUrl: zine.coverImageUrl || "https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png",
          userHandle: zine.userHandle || "Curator"
        };
        html = injectZineSEOMetadata(html, zineSEO, pageUrl);
      }
      
      if (process.env.NODE_ENV !== "production" && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      }
      
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (err: any) {
      console.error("MIMI // Error generating server-side SEO:", err);
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        res.sendFile(path.join(process.cwd(), 'index.html'));
      } else {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
      }
    }
  });

  app.get("/u/:handle", async (req, res) => {
    try {
      const handle = normalizeFeedHandle(req.params.handle || "");
      if (!handle) {
        return res.status(404).send("Handle required");
      }

      console.log(`MIMI // Server-side SEO requested for public profile: @${handle}`);

      const profile = await fetchProfileServerSide(handle);

      let htmlPath = "";
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        htmlPath = path.join(process.cwd(), "index.html");
      } else {
        htmlPath = path.join(process.cwd(), "dist", "index.html");
      }

      if (!fs.existsSync(htmlPath)) {
        return res.status(404).send("Index template not found");
      }

      let html = fs.readFileSync(htmlPath, "utf8");

      if (profile) {
        const baseUrl = getPublicBaseUrl(req);
        const seo = buildPublicProfileSeoData(profile as any, baseUrl);
        html = injectPublicProfileSEOMetadata(html, seo);
      }

      if (process.env.NODE_ENV !== "production" && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err: unknown) {
      console.error("MIMI // Error generating public profile SEO:", err);
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        res.sendFile(path.join(process.cwd(), "index.html"));
      } else {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      }
    }
  });

  app.get("/taste-corpus", async (req, res) => {
    try {
      let htmlPath = "";
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        htmlPath = path.join(process.cwd(), "index.html");
      } else {
        htmlPath = path.join(process.cwd(), "dist", "index.html");
      }

      if (!fs.existsSync(htmlPath)) {
        return res.status(404).send("Index template not found");
      }

      let html = fs.readFileSync(htmlPath, "utf8");
      const pageUrl = `https://${req.get("host")}/taste-corpus`;
      html = injectTasteCorpusPageHtml(html, pageUrl, process.cwd());

      if (process.env.NODE_ENV !== "production" && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err: unknown) {
      console.error("MIMI // Error generating taste corpus SEO:", err);
      if (process.env.NODE_ENV !== "production" && viteAvailable) {
        res.sendFile(path.join(process.cwd(), "index.html"));
      } else {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      }
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), 'dist');
  
  let viteAvailable = false;
  try {
    if (typeof require !== 'undefined') {
      require.resolve('vite');
    } else {
      await import.meta.resolve('vite');
    }
    viteAvailable = true;
  } catch (e) {
    viteAvailable = false;
  }

  if (process.env.NODE_ENV !== "production" && viteAvailable) {
    try {
      // Use dynamic import with a variable to prevent esbuild from trying to bundle it
      const viteModuleName = 'vite';
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      viteInstance = vite;
      app.use(vite.middlewares);
    } catch (error) {
      console.log("Vite not found, serving static files from dist");
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
