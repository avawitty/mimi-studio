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

function readFirebaseToolsAccessToken() {
  const home = process.env.HOME || "";
  const candidates = [`${home}/.config/configstore/firebase-tools.json`];
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      const cfg = JSON.parse(readFileSync(path, "utf8"));
      const access = cfg?.tokens?.access_token;
      const expiresAt = Number(cfg?.tokens?.expires_at || 0);
      if (typeof access === "string" && access && (!expiresAt || expiresAt > Date.now())) {
        return access;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function getAccessToken() {
  const fromEnv = process.env.GOOGLE_CLOUD_ACCESS_TOKEN || process.env.FIREBASE_TOKEN;
  if (fromEnv) return fromEnv;

  const fromConfig = readFirebaseToolsAccessToken();
  if (fromConfig) return fromConfig;

  try {
    return execFileSync("gcloud", ["auth", "print-access-token"], {
      encoding: "utf8",
    }).trim();
  } catch {
    /* fall through */
  }

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
  const vercelProject = argValue("--vercel-project", process.env.VERCEL_PROJECT_NAME || "mimi-studio-gateway");
  console.log(`Project: ${projectId}`);
  await ensureFirebaseAuthDomains(projectId);
  await ensureVercelDomain(vercelProject);
  console.log("\nNotes:");
  console.log("- CORS for https://mimi.rip is already in functions/src/index.ts on this branch.");
  console.log("- Production API currently runs on Vercel Express (not Cloud Functions).");
  console.log("- Firebase Functions deploy requires Blaze billing on this project.");
  console.log(`  If/when billing is enabled: cd functions && npm install && npm run build &&`);
  console.log(`  npx firebase deploy --only functions --project ${projectId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
