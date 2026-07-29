import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import express from "express";
import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { MIMI_WIDGET_URI, renderMimiWidgetHtml } from "./widget.js";
import {
  createTailorWidgetProjection,
  parseTailorImport,
  tailorWidgetProjectionSchema,
} from "../services/tailorProfileContract.js";
import { searchShopifyGlobalCatalog } from "../lib/shopifyCatalog.js";
import { mimiRouter } from "../src/mimi.js";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

const PORT = Number(process.env.MCP_PORT || 8787);
const HOST = process.env.MCP_HOST || "127.0.0.1";
const APP_ORIGIN = (process.env.MIMI_APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
const noAuth = { securitySchemes: [{ type: "noauth" as const }] };
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
};
const openWorldReadAnnotations = {
  ...annotations,
  openWorldHint: true,
};

const references = [
  {
    id: "mimi-creator-flow",
    title: "Mimi creator flow",
    text: "Collect source material, shape an editable brief, preview the direction, develop the issue, and publish with Used Context visible.",
  },
  {
    id: "mimi-used-context",
    title: "Used Context",
    text: "Used Context shows which approved references and signals shaped an output so the creator can review provenance.",
  },
  {
    id: "mimi-editor-authority",
    title: "Creator authority",
    text: "Mimi proposes structure and composition; the user keeps, edits, rejects, and decides when an issue becomes final.",
  },
];

const briefSchema = z.object({
  kind: z.literal("brief"),
  title: z.string(),
  summary: z.string(),
  sourceMaterial: z.string(),
  editorialIntention: z.string(),
  centralTension: z.string(),
  desiredFeeling: z.string(),
  avoid: z.string(),
  outputWanted: z.string(),
});
const tailorReviewRenderSchema = tailorWidgetProjectionSchema.extend({
  kind: z.literal("tailor_review"),
});

export function createMimiMcpServer() {
  const server = new McpServer(
    { name: "mimi-studio", version: "3.0.0" },
    {
      instructions:
        "Mimi is evidence-first. Help the creator shape material before generating. Treat every brief as editable and preserve the user as final editor.",
    },
  );

  registerAppResource(
    server,
    "Mimi Studio",
    MIMI_WIDGET_URI,
    { description: "Interactive Mimi creator journey, editorial brief, and Tailor review." },
    async () => ({
      contents: [
        {
          uri: MIMI_WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: renderMimiWidgetHtml(),
          _meta: {
            ui: {
              prefersBorder: true,
              csp: { connectDomains: [], resourceDomains: [] },
            },
            "openai/widgetDescription":
              "A visual Mimi workspace for shaping source material and reviewing an evidence-linked Tailor profile.",
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [],
            },
          },
        },
      ],
    }),
  );

  server.registerTool(
    "search",
    {
      title: "Search Mimi knowledge",
      description:
        "Use when the user asks how Mimi's creator flow, Used Context, or approval model works.",
      inputSchema: { query: z.string().min(1).max(300) },
      outputSchema: {
        results: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            url: z.string(),
            snippet: z.string(),
          }),
        ),
      },
      annotations,
      _meta: noAuth,
    },
    async ({ query }) => {
      const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
      const results = references
        .filter((item) =>
          terms.some((term) => `${item.title} ${item.text}`.toLowerCase().includes(term)),
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          url: APP_ORIGIN,
          snippet: item.text,
        }));
      return {
        structuredContent: { results },
        content: [
          {
            type: "text",
            text: results.length
              ? `Found ${results.length} Mimi reference${results.length === 1 ? "" : "s"}.`
              : "No Mimi references matched.",
          },
        ],
      };
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch Mimi knowledge",
      description: "Use to retrieve a complete Mimi reference returned by search.",
      inputSchema: { id: z.string().min(1) },
      outputSchema: {
        id: z.string(),
        title: z.string(),
        url: z.string(),
        text: z.string(),
      },
      annotations,
      _meta: noAuth,
    },
    async ({ id }) => {
      const item = references.find((candidate) => candidate.id === id);
      if (!item) {
        return {
          isError: true,
          content: [{ type: "text", text: `No Mimi reference exists for ${id}.` }],
        };
      }
      const value = { ...item, url: APP_ORIGIN };
      return {
        structuredContent: value,
        content: [{ type: "text", text: `${item.title}: ${item.text}` }],
      };
    },
  );

  server.registerTool(
    "compile_tailor_review",
    {
      title: "Compile a Tailor review",
      description:
        "Use this when the user provides Tailor JSON and wants an evidence-aware summary. Accept canonical Tailor Profile v2 or a legacy Tailor draft, and return only the compact review projection.",
      inputSchema: {
        profile: z.record(z.string(), z.unknown()),
      },
      outputSchema: tailorWidgetProjectionSchema,
      annotations,
      _meta: {
        ...noAuth,
        "openai/toolInvocation/invoking": "Compiling the Tailor review",
        "openai/toolInvocation/invoked": "Tailor review compiled",
      },
    },
    async ({ profile }) => {
      try {
        const parsed = parseTailorImport(profile);
        const projection = createTailorWidgetProjection(parsed.profile);
        return {
          structuredContent: projection,
          content: [
            {
              type: "text",
              text: `Tailor review compiled at ${Math.round(
                projection.widget.confidence * 100,
              )}% confidence. Review the thesis, preserve rules, avoid rules, and next question before confirming it.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? `Tailor could not read this profile: ${error.message}`
                  : "Tailor could not read this profile.",
            },
          ],
        };
      }
    },
  );

  registerAppTool(
    server,
    "render_tailor_review",
    {
      title: "Render a Tailor review",
      description:
        "Render the compact Tailor review widget. First call compile_tailor_review, then pass its widget and profileRef output to this tool.",
      inputSchema: {
        widget: tailorWidgetProjectionSchema.shape.widget,
        profileRef: tailorWidgetProjectionSchema.shape.profileRef,
      },
      outputSchema: tailorReviewRenderSchema,
      annotations,
      _meta: {
        ...noAuth,
        ui: { resourceUri: MIMI_WIDGET_URI },
        "openai/outputTemplate": MIMI_WIDGET_URI,
        "openai/toolInvocation/invoking": "Opening the Tailor review",
        "openai/toolInvocation/invoked": "Tailor review ready",
      },
    },
    async ({ widget, profileRef }) => ({
      structuredContent: {
        kind: "tailor_review" as const,
        widget,
        profileRef,
      },
      content: [
        {
          type: "text",
          text: "The Tailor review is open. The thesis remains editable until the creator confirms it.",
        },
      ],
    }),
  );

  server.registerTool(
    "search_shopify_catalog",
    {
      title: "Search Shopify catalog",
      description:
        "Use this when the user wants read-only product discovery across Shopify merchants. Keep discovery separate from Mimi publishing and explain that returned products are candidates, not endorsements.",
      inputSchema: {
        query: z.string().min(1).max(500),
        intent: z.string().max(1_000).optional(),
        country: z.string().length(2).default("US"),
        limit: z.number().int().min(1).max(20).default(8),
      },
      outputSchema: {
        productCount: z.number().int().nonnegative(),
        products: z.array(z.record(z.string(), z.unknown())),
      },
      annotations: openWorldReadAnnotations,
      _meta: {
        ...noAuth,
        "openai/toolInvocation/invoking": "Searching Shopify possibilities",
        "openai/toolInvocation/invoked": "Shopify candidates ready",
      },
    },
    async ({ query, intent, country, limit }) => {
      const agentProfileUrl = (process.env.SHOPIFY_UCP_AGENT_PROFILE || "").trim();
      if (!agentProfileUrl) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Shopify discovery is not configured. Mimi needs a public SHOPIFY_UCP_AGENT_PROFILE before catalog search can run.",
            },
          ],
        };
      }

      try {
        const result = await searchShopifyGlobalCatalog({
          query,
          intent,
          country,
          limit,
          agentProfileUrl,
        });
        const products = result.products.filter(
          (product): product is Record<string, unknown> =>
            Boolean(product) && typeof product === "object" && !Array.isArray(product),
        );
        return {
          structuredContent: {
            productCount: products.length,
            products,
          },
          content: [
            {
              type: "text",
              text: `Found ${products.length} Shopify product candidate${
                products.length === 1 ? "" : "s"
              }. Compare them against the creator's approved Tailor rules before recommending one.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? `Shopify catalog search failed: ${error.message}`
                  : "Shopify catalog search failed.",
            },
          ],
        };
      }
    },
  );

  registerAppTool(
    server,
    "open_mimi_studio",
    {
      title: "Open Mimi Studio",
      description:
        "Use when the user wants a visual Mimi workspace to begin an editorial issue from source material.",
      inputSchema: {
        projectTitle: z.string().min(1).max(120).default("Untitled issue"),
      },
      outputSchema: {
        kind: z.literal("studio"),
        projectId: z.string(),
        projectTitle: z.string(),
      },
      annotations,
      _meta: {
        ...noAuth,
        ui: { resourceUri: MIMI_WIDGET_URI },
        "openai/outputTemplate": MIMI_WIDGET_URI,
        "openai/toolInvocation/invoking": "Opening Mimi Studio",
        "openai/toolInvocation/invoked": "Mimi Studio ready",
      },
    },
    async ({ projectTitle }) => ({
      structuredContent: {
        kind: "studio" as const,
        projectId: `chatgpt-${randomUUID()}`,
        projectTitle,
      },
      content: [
        {
          type: "text",
          text: "Mimi Studio is open. Add source material, then shape an editable brief.",
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "shape_mimi_brief",
    {
      title: "Shape a Mimi brief",
      description:
        "Use when the user provides source material. Extract an editable editorial intention, central tension, desired feeling, exclusions, and output. Do not present the brief as final.",
      inputSchema: {
        sourceMaterial: z.string().min(1).max(8000),
        title: z.string().max(120).default("Untitled issue"),
        summary: z.string().max(500).default("An editable starting point shaped from the source material."),
        editorialIntention: z.string().max(600).default("Clarify the creator's point of view."),
        centralTension: z.string().max(600).default("What should remain unresolved or productively in tension?"),
        desiredFeeling: z.string().max(300).default("Specific, intentional, and alive."),
        avoid: z.string().max(300).default("Generic conclusions and unsupported claims."),
        outputWanted: z.string().max(200).default("Editorial issue"),
      },
      outputSchema: briefSchema,
      annotations,
      _meta: {
        ...noAuth,
        ui: { resourceUri: MIMI_WIDGET_URI },
        "openai/outputTemplate": MIMI_WIDGET_URI,
        "openai/toolInvocation/invoking": "Shaping the brief",
        "openai/toolInvocation/invoked": "Editable brief ready",
      },
    },
    async (input) => ({
      structuredContent: { kind: "brief" as const, ...input },
      content: [
        {
          type: "text",
          text: "The brief is ready for review. Ask the creator what to keep, edit, or reject before developing the issue.",
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "show_mimi_core_flow",
    {
      title: "Show Mimi's creator flow",
      description: "Use when the user asks for a visual explanation of how Mimi works.",
      inputSchema: {},
      outputSchema: {
        kind: z.literal("core_flow"),
        steps: z.array(z.object({ title: z.string(), description: z.string() })),
      },
      annotations,
      _meta: {
        ...noAuth,
        ui: { resourceUri: MIMI_WIDGET_URI },
        "openai/outputTemplate": MIMI_WIDGET_URI,
        "openai/toolInvocation/invoking": "Opening the creator flow",
        "openai/toolInvocation/invoked": "Creator flow ready",
      },
    },
    async () => ({
      structuredContent: {
        kind: "core_flow" as const,
        steps: [
          { title: "Collect", description: "Bring in fragments, references, questions, and evidence." },
          { title: "Shape", description: "Turn the material into an editable brief and visible context." },
          { title: "Create", description: "Preview direction, then choose when to develop the full issue." },
          { title: "Publish", description: "Release the work with provenance and Used Context attached." },
        ],
      },
      content: [
        {
          type: "text",
          text: "Mimi's creator flow is Collect, Shape, Create, and Publish—with the creator as final editor.",
        },
      ],
    }),
  );

  return server;
}

export async function handleMimiMcpRequest(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const server = createMimiMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  return transport.handleRequest(req, res, req.body);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // Add Mimi REST API routes BEFORE MCP
  app.use("/api/mimi", mimiRouter);

  // Keep existing MCP routes
  app.all("/mcp", (req, res) => void handleMimiMcpRequest(req, res));
  app.get("/widget-preview", (_req, res) =>
    res.type("html").send(renderMimiWidgetHtml()),
  );
  app.get("/", (_req, res) =>
    res.json({ ok: true, service: "mimi-studio-mcp", endpoint: "/mcp" }),
  );
  app.listen(PORT, HOST, () =>
    console.log(`Mimi MCP listening at http://${HOST}:${PORT}/mcp`),
  );
}
