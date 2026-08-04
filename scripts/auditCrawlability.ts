/**
 * Crawlability audit — fetches a set of paths against a base URL with a
 * Googlebot user-agent and reports what a crawler actually receives:
 * status, content-type, body hash (to spot identical SPA-shell responses),
 * visible text volume, and presence of basic discovery/SEO signals.
 *
 * Usage:
 *   tsx scripts/auditCrawlability.ts <baseUrl> <path...>
 *   npm run audit:crawl -- https://www.mimi.you / /tailor /press
 *
 * Prints a table + summary to stdout. Redirect to a file to snapshot a
 * baseline, e.g.:
 *   npm run audit:crawl -- https://www.mimi.you / /tailor > .codex-audit/crawl-baseline.txt
 */
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

interface PathReport {
  path: string;
  status: string;
  contentType: string;
  bodyMd5: string;
  textChars: number;
  hasTitle: boolean;
  hasDescription: boolean;
  hasCanonical: boolean;
  hasJsonLd: boolean;
  hasNoscript: boolean;
  error?: string;
}

function isHtml(contentType: string): boolean {
  return contentType.toLowerCase().includes("html");
}

async function auditPath(baseUrl: string, path: string): Promise<PathReport> {
  const url = new URL(path, baseUrl).toString();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": GOOGLEBOT_UA },
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    const bodyMd5 = createHash("md5").update(buf).digest("hex");

    if (isHtml(contentType)) {
      const html = buf.toString("utf-8");
      const $ = cheerio.load(html);
      $("script, style").remove();
      const textChars = $.root().text().replace(/\s+/g, " ").trim().length;

      const title = $("title").first().text().trim();
      const description = $('meta[name="description"]').attr("content")?.trim();
      const canonical = $('link[rel="canonical"]').attr("href")?.trim();
      const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
      const hasNoscript = $("noscript").length > 0;

      return {
        path,
        status: String(res.status),
        contentType,
        bodyMd5,
        textChars,
        hasTitle: Boolean(title),
        hasDescription: Boolean(description),
        hasCanonical: Boolean(canonical),
        hasJsonLd,
        hasNoscript,
      };
    }

    // Non-HTML responses (txt, xml, json, ...): no script/style to strip,
    // and title/meta/JSON-LD/noscript presence checks don't apply.
    const textChars = buf.toString("utf-8").replace(/\s+/g, " ").trim().length;
    return {
      path,
      status: String(res.status),
      contentType,
      bodyMd5,
      textChars,
      hasTitle: false,
      hasDescription: false,
      hasCanonical: false,
      hasJsonLd: false,
      hasNoscript: false,
    };
  } catch (err) {
    return {
      path,
      status: "ERR",
      contentType: "-",
      bodyMd5: "-",
      textChars: 0,
      hasTitle: false,
      hasDescription: false,
      hasCanonical: false,
      hasJsonLd: false,
      hasNoscript: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function yn(v: boolean): string {
  return v ? "yes" : "no";
}

function formatTable(rows: PathReport[]): string {
  const headers = [
    "PATH",
    "STATUS",
    "CONTENT-TYPE",
    "BODY-MD5",
    "TEXT-CHARS",
    "TITLE",
    "DESC",
    "CANONICAL",
    "JSON-LD",
    "NOSCRIPT",
  ];
  const cells = rows.map((r) => [
    r.path,
    r.status,
    r.contentType || "-",
    r.bodyMd5,
    String(r.textChars),
    yn(r.hasTitle),
    yn(r.hasDescription),
    yn(r.hasCanonical),
    yn(r.hasJsonLd),
    yn(r.hasNoscript),
  ]);
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...cells.map((row) => row[i].length)),
  );
  const line = (cols: string[]) =>
    cols.map((c, i) => c.padEnd(widths[i])).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  return [line(headers), sep, ...cells.map(line)].join("\n");
}

async function main() {
  const [baseUrl, ...paths] = process.argv.slice(2);
  if (!baseUrl || paths.length === 0) {
    console.error(
      "Usage: tsx scripts/auditCrawlability.ts <baseUrl> <path...>",
    );
    process.exit(1);
  }

  const reports: PathReport[] = [];
  for (const path of paths) {
    // Sequential, not parallel: keeps output order stable and avoids
    // hammering the target with concurrent Googlebot-UA requests.
    reports.push(await auditPath(baseUrl, path));
  }

  console.log(`Crawlability audit — ${baseUrl}\n`);
  console.log(formatTable(reports));

  const errors = reports.filter((r) => r.error);
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const r of errors) {
      console.log(`  ${r.path}: ${r.error}`);
    }
  }

  const distinctBodies = new Set(reports.map((r) => r.bodyMd5)).size;
  console.log(
    `\nSummary: ${distinctBodies} distinct document${distinctBodies === 1 ? "" : "s"} served across ${reports.length} path${reports.length === 1 ? "" : "s"}.`,
  );
}

main();
