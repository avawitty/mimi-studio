#!/usr/bin/env node
/**
 * Move mimi.you / mimi.rip / mimi.fish DNS from Lovable (185.158.133.1)
 * back to Vercel project mimi-studio-gateway (76.76.21.21).
 *
 * Prerequisite: disconnect custom domains in Lovable first
 *   Project → Settings → Domains → Disconnect for each host.
 *
 * Usage:
 *   VERCEL_TOKEN=… node scripts/migrateMimiDomainsFromLovable.mjs
 *   VERCEL_TOKEN=… node scripts/migrateMimiDomainsFromLovable.mjs --dry-run
 */

const LOVABLE_IP = "185.158.133.1";
const VERCEL_IP = "76.76.21.21";
const VERCEL_WWW_CNAME = "cname.vercel-dns.com";
const VERCEL_TEAM = process.env.VERCEL_TEAM_SLUG || "mimizine";
const VERCEL_PROJECT = process.env.VERCEL_PROJECT_NAME || "mimi-studio-gateway";

const TLDS = ["you", "rip", "fish"];

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiJson(url, { token, method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: apiHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const message = data?.error?.message || data?.message || text || res.statusText;
    throw new Error(`${method} ${url} failed: ${res.status} ${message}`);
  }
  return data;
}

async function listRecords(token, domain) {
  const data = await apiJson(
    `https://api.vercel.com/v5/domains/${encodeURIComponent(domain)}/records?teamId=${encodeURIComponent(VERCEL_TEAM)}&limit=100`,
    { token },
  );
  return data.records || [];
}

async function upsertApexA(token, domain, records, dryRun) {
  const apex = records.find((r) => r.type === "A" && (r.name === "" || r.name === "@"));
  if (apex?.value === VERCEL_IP) {
    console.log(`  ${domain} @ A already ${VERCEL_IP}`);
    return;
  }
  if (apex?.value === LOVABLE_IP) {
    console.log(`  ${domain} @ A ${LOVABLE_IP} → ${VERCEL_IP}`);
    if (!dryRun) {
      await apiJson(
        `https://api.vercel.com/v1/domains/records/${encodeURIComponent(apex.id)}?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
        { token, method: "PATCH", body: { value: VERCEL_IP } },
      );
    }
    return;
  }
  if (apex) {
    console.log(`  ${domain} @ A ${apex.value} → ${VERCEL_IP}`);
    if (!dryRun) {
      await apiJson(
        `https://api.vercel.com/v1/domains/records/${encodeURIComponent(apex.id)}?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
        { token, method: "PATCH", body: { value: VERCEL_IP } },
      );
    }
    return;
  }
  console.log(`  ${domain} @ create A ${VERCEL_IP}`);
  if (!dryRun) {
    await apiJson(
      `https://api.vercel.com/v2/domains/${encodeURIComponent(domain)}/records?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
      { token, method: "POST", body: { type: "A", name: "", value: VERCEL_IP } },
    );
  }
}

async function upsertWwwCname(token, domain, records, dryRun) {
  const www = records.find((r) => r.type === "CNAME" && r.name === "www");
  if (www?.value === VERCEL_WWW_CNAME) {
    console.log(`  www.${domain} CNAME already ${VERCEL_WWW_CNAME}`);
    return;
  }
  if (www) {
    console.log(`  www.${domain} CNAME ${www.value} → ${VERCEL_WWW_CNAME}`);
    if (!dryRun) {
      await apiJson(
        `https://api.vercel.com/v1/domains/records/${encodeURIComponent(www.id)}?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
        { token, method: "PATCH", body: { value: VERCEL_WWW_CNAME } },
      );
    }
    return;
  }
  console.log(`  www.${domain} create CNAME ${VERCEL_WWW_CNAME}`);
  if (!dryRun) {
    await apiJson(
      `https://api.vercel.com/v2/domains/${encodeURIComponent(domain)}/records?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
      { token, method: "POST", body: { type: "CNAME", name: "www", value: VERCEL_WWW_CNAME } },
    );
  }
}

async function removeRecords(token, domain, records, predicate, label, dryRun) {
  for (const record of records.filter(predicate)) {
    console.log(`  ${domain} remove ${label}: ${record.type} ${record.name || "@"} ${record.value}`);
    if (!dryRun) {
      await apiJson(
        `https://api.vercel.com/v2/domains/${encodeURIComponent(domain)}/records/${encodeURIComponent(record.id)}?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
        { token, method: "DELETE" },
      );
    }
  }
}

async function ensureProjectDomains(token, dryRun) {
  const project = await apiJson(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(VERCEL_PROJECT)}?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
    { token },
  );
  const hosts = new Set([
    ...TLDS.flatMap((tld) => [`mimi.${tld}`, `www.mimi.${tld}`]),
  ]);
  for (const name of hosts) {
    if (project?.targets?.production?.alias?.includes?.(name)) continue;
    console.log(`Vercel project: attach ${name}`);
    if (!dryRun) {
      try {
        await apiJson(
          `https://api.vercel.com/v10/projects/${encodeURIComponent(project.id)}/domains?teamId=${encodeURIComponent(VERCEL_TEAM)}`,
          { token, method: "POST", body: { name } },
        );
      } catch (err) {
        if (!String(err.message).includes("409") && !String(err.message).includes("already")) {
          throw err;
        }
        console.log(`  already attached`);
      }
    }
  }
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error(
      "VERCEL_TOKEN is required. Create one at https://vercel.com/account/tokens (team: mimizine).",
    );
  }

  console.log(`Team: ${VERCEL_TEAM}`);
  console.log(`Project: ${VERCEL_PROJECT}`);
  console.log(dryRun ? "Mode: dry-run\n" : "Mode: apply\n");

  console.log("1) Ensure domains are attached to mimi-studio-gateway");
  await ensureProjectDomains(token, dryRun);
  console.log("");

  for (const tld of TLDS) {
    const domain = `mimi.${tld}`;
    console.log(`2) DNS for ${domain}`);
    const records = await listRecords(token, domain);
    await upsertApexA(token, domain, records, dryRun);
    await upsertWwwCname(token, domain, records, dryRun);
    await removeRecords(token, domain, records, (r) => r.type === "AAAA", "AAAA");
    await removeRecords(
      token,
      domain,
      records,
      (r) => r.type === "TXT" && /lovable/i.test(String(r.value)),
      "Lovable TXT",
      dryRun,
    );
    console.log("");
  }

  console.log("3) Manual Lovable step (cannot be automated without Lovable UI/API):");
  console.log("   lovable.dev → Mimi Studios → Settings → Domains");
  console.log("   Disconnect mimi.you, www.mimi.you, mimi.rip, www.mimi.rip, mimi.fish, www.mimi.fish");
  console.log("");
  console.log("4) Verify after DNS propagation:");
  for (const tld of TLDS) {
    for (const host of [`mimi.${tld}`, `www.mimi.${tld}`]) {
      console.log(`   curl -sI https://${host} | rg -i 'server:|x-vercel'`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
