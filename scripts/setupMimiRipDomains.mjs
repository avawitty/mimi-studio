#!/usr/bin/env node
/**
 * Setup mimi.rip for Auth authorized domains (+ optional Vercel domain attach).
 *
 * Prerequisites:
 *   - Firebase CLI logged in (`npx firebase login` or MCP firebase_login)
 *   - Active project: mimistudios (see .firebaserc)
 *   - Optional: VERCEL_TOKEN + linked project for domain attach
 *
 * Usage:
 *   node scripts/setupMimiRipDomains.mjs
 *   node scripts/setupMimiRipDomains.mjs --project mimistudios
 *   VERCEL_TOKEN=… node scripts/setupMimiRipDomains.mjs --vercel-project mimi-studio
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const DOMAINS_TO_ADD = ["mimi.rip", "www.mimi.rip"];

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function readDefaultProject() {
  if (!existsSync(".firebaserc")) return "mimistudios";
  try {
    const rc = JSON.parse(readFileSync(".firebaserc", "utf8"));
    return rc.projects?.default || "mimistudios";
  } catch {
    return "mimistudios";
  }
}

function getAccessToken() {
  // firebase login:ci tokens are CI tokens; for user login, use google application
  // credentials via `firebase login:list` doesn't expose AT. Prefer gcloud/ADC,
  // else parse firebase-tools config refresh if present.
  try {
    const out = execFileSync(
      "npx",
      ["-y", "firebase-tools@latest", "login:list", "--json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    JSON.parse(out);
  } catch {
    /* ignore */
  }

  // Use Firebase CLI's internal credential helper via Identity Toolkit curl
  // with `firebase experiments:enable webframeworks` not needed.
  // Standard approach: `gcloud auth print-access-token` or Application Default.
  try {
    return execFileSync("gcloud", ["auth", "print-access-token"], {
      encoding: "utf8",
    }).trim();
  } catch {
    /* fall through */
  }

  // firebase-tools stores refresh tokens; use REST token exchange via CLI:
  // `firebase --token` CI tokens work against some APIs but not always Identity Toolkit admin.
  const token = process.env.FIREBASE_TOKEN || process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
  if (token) return token;

  throw new Error(
    "No Google access token. Run `npx firebase login` (or Firebase MCP login), " +
      "install gcloud and `gcloud auth application-default login`, " +
      "or set GOOGLE_CLOUD_ACCESS_TOKEN / FIREBASE_TOKEN.",
  );
}

async function getAuthorizedDomains(projectId, accessToken) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`getConfig failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.authorizedDomains || [];
}

async function setAuthorizedDomains(projectId, accessToken, domains) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=authorizedDomains`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authorizedDomains: domains }),
  });
  if (!res.ok) {
    throw new Error(`updateConfig failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function ensureFirebaseAuthDomains(projectId) {
  const accessToken = getAccessToken();
  const current = await getAuthorizedDomains(projectId, accessToken);
  const next = [...current];
  const added = [];
  for (const d of DOMAINS_TO_ADD) {
    if (!next.includes(d)) {
      next.push(d);
      added.push(d);
    }
  }
  if (added.length === 0) {
    console.log(`Firebase Auth: already has ${DOMAINS_TO_ADD.join(", ")}`);
    console.log(`Current domains (${current.length}): ${current.join(", ")}`);
    return { added: [], current };
  }
  await setAuthorizedDomains(projectId, accessToken, next);
  console.log(`Firebase Auth: added ${added.join(", ")}`);
  console.log(`Authorized domains now (${next.length}): ${next.join(", ")}`);
  return { added, current: next };
}

async function ensureVercelDomain(projectName) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.log("Vercel: skipped (no VERCEL_TOKEN). Add mimi.rip in Vercel → Project → Domains.");
    return null;
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // Resolve project
  const projRes = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`,
    { headers },
  );
  if (!projRes.ok) {
    throw new Error(`Vercel project lookup failed: ${projRes.status} ${await projRes.text()}`);
  }
  const project = await projRes.json();
  const results = [];
  for (const name of DOMAINS_TO_ADD) {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(project.id)}/domains`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`Vercel: attached ${name}`);
      results.push({ name, ok: true, body });
    } else if (String(body?.error?.code || "").includes("domain_already") || res.status === 409) {
      console.log(`Vercel: ${name} already on project`);
      results.push({ name, ok: true, already: true });
    } else {
      console.error(`Vercel: failed ${name}: ${res.status}`, body);
      results.push({ name, ok: false, body });
    }
  }
  return results;
}

async function main() {
  const projectId = argValue("--project", readDefaultProject());
  const vercelProject = argValue("--vercel-project", process.env.VERCEL_PROJECT_NAME || "mimi-studio");
  console.log(`Project: ${projectId}`);
  await ensureFirebaseAuthDomains(projectId);
  await ensureVercelDomain(vercelProject);
  console.log("\nNext: deploy functions with CORS allowlist:");
  console.log(`  cd functions && npm ci && npm run build`);
  console.log(`  npx firebase deploy --only functions --project ${projectId}`);
  console.log("CORS for https://mimi.rip is already in functions/src/index.ts on this branch.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
