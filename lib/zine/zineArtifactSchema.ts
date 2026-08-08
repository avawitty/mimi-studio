import { z } from "zod";
import type { MimiZineArtifact } from "../../types";

export const MIMI_ZINE_ARTIFACT_SCHEMA_VERSION = 1;

export const zineIssueModeSchema = z.enum([
  "editorial",
  "research",
  "seasonal",
  "oracle",
]);

export const zineLifecycleStatusSchema = z.enum([
  "draft",
  "reading",
  "direction-proposed",
  "direction-approved",
  "composing",
  "proof",
  "approved",
  "published",
  "archived",
]);

export const zinePageGrammarSchema = z.enum([
  "specimen",
  "reading",
  "evidence-ledger",
  "editorial-split",
  "dark-plate",
  "debris",
  "celestial",
  "screenwrite",
  "sonic",
  "signal-index",
  "chromatic",
  "owner-carousel",
  "used-context",
  "contact-sheet",
  "material-specimen",
  "forecast-drift",
]);

export const zineSectionTypeSchema = z.enum([
  "cover",
  "opening",
  "reading",
  "signal-index",
  "essay",
  "visual-plate",
  "evidence",
  "interlude",
  "roadmap",
  "debris",
  "colophon",
]);

const contextVisibilitySchema = z.object({
  working: z.boolean(),
  export: z.boolean(),
  public: z.boolean(),
});

const editorElementStyleSchema = z
  .object({
    top: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number().optional(),
    zIndex: z.number().optional(),
    rotation: z.number().optional(),
    opacity: z.number().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    fontStyle: z.string().optional(),
    lineHeight: z.number().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    objectFit: z.enum(["cover", "contain"]).optional(),
    filter: z.string().optional(),
    color: z.string().optional(),
  })
  .passthrough();

const editorElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["image", "text", "box", "signal", "analysis_pin"]),
    content: z.string(),
    style: editorElementStyleSchema,
  })
  .passthrough();

const usedContextSnapshotSchema = z
  .object({
    atomId: z.string(),
    title: z.string(),
    content: z.string(),
    source: z.string().optional(),
    capturedAt: z.number().optional(),
    visibility: contextVisibilitySchema.optional(),
  })
  .passthrough();

const semioticSignalSchema = z
  .object({
    motif: z.string(),
    context: z.string(),
    epistemicStatus: z
      .enum(["observed", "inferred", "proposed", "unknown"])
      .optional(),
    confidence: z.number().min(0).max(1).optional(),
    sourceIds: z.array(z.string()).optional(),
    sourceCount: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const zinePageSpecSchema = z
  .object({
    id: z.string().min(1).optional(),
    pageNumber: z.number().int().positive(),
    headline: z.string(),
    bodyCopy: z.string(),
    supportingText: z.string().optional(),
    imagePrompt: z.string(),
    image_url: z.string().optional(),
    originalMediaUrl: z.string().optional(),
    altText: z.string().optional(),
    sectionId: z.string().optional(),
    sectionType: zineSectionTypeSchema.optional(),
    grammar: zinePageGrammarSchema.optional(),
    sourceIds: z.array(z.string()).optional(),
    revision: z.number().int().positive().optional(),
    assetRevision: z.number().int().nonnegative().optional(),
    layoutRevision: z.number().int().nonnegative().optional(),
    customLayout: z
      .object({
        elements: z.array(editorElementSchema),
        readingOrder: z.array(z.string()).optional(),
        editTrace: z
          .array(z.object({ timestamp: z.number(), note: z.string() }))
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export const mimiZineArtifactSchema = z.object({
  schemaVersion: z.literal(MIMI_ZINE_ARTIFACT_SCHEMA_VERSION),
  identity: z.object({
    id: z.string().min(1),
    title: z.string(),
    subtitle: z.string().optional(),
    issueNumber: z.string().optional(),
    slug: z.string().optional(),
    mode: zineIssueModeSchema,
    tone: z.string().optional(),
    theme: z.string().optional(),
  }),
  authorship: z.object({
    ownerUid: z.string(),
    creatorHandle: z.string(),
    displayName: z.string().optional(),
    profileVersion: z.number().int().nonnegative().optional(),
    generatedBy: z.object({
      system: z.literal("mimi"),
      generationVersion: z.string().optional(),
      model: z.string().optional(),
    }),
    editorialCompileOwnerUid: z.string().optional(),
    editorialCompileOwnerHandle: z.string().optional(),
  }),
  status: zineLifecycleStatusSchema,
  sourcePacket: z.object({
    originalInput: z.string().optional(),
    fragmentIds: z.array(z.string()),
    usedContextSnapshots: z.array(usedContextSnapshotSchema),
    attachedAssets: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["text", "image", "link", "voice", "document", "board"]),
        title: z.string().optional(),
        uri: z.string().optional(),
        excerpt: z.string().optional(),
        source: z.string().optional(),
        capturedAt: z.number().optional(),
        rights: z.enum(["owned", "reference", "unknown"]).optional(),
        visibility: contextVisibilitySchema.optional(),
      }),
    ),
    linkedBoards: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().optional(),
          uri: z.string().optional(),
          source: z.string().optional(),
        }),
      )
      .optional(),
    sourceSummary: z.string().optional(),
  }),
  reading: z.object({
    oracularMirror: z.string().optional(),
    centralObservation: z.string(),
    strategicHypothesis: z.string().optional(),
    signals: z.array(semioticSignalSchema),
    tensions: z
      .array(
        z.object({
          statement: z.string(),
          sourceIds: z.array(z.string()).optional(),
          status: z
            .enum(["observed", "inferred", "proposed", "unknown"])
            .optional(),
        }),
      )
      .optional(),
    exclusions: z.array(z.string()).optional(),
    uncertainty: z
      .array(
        z.object({
          statement: z.string(),
          reason: z.string().optional(),
          sourceIds: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    approvedAt: z.number().optional(),
    approvedBy: z.string().optional(),
  }),
  direction: z.object({
    thesis: z.string(),
    purpose: z.string(),
    audience: z.string().optional(),
    visualPrinciples: z.array(z.string()),
    tonalPrinciples: z.array(z.string()),
    exclusions: z.array(z.string()),
    palette: z.array(z.string()),
    typography: z
      .object({
        displayFamily: z.string().optional(),
        bodyFamily: z.string().optional(),
        labelFamily: z.string().optional(),
        scale: z.enum(["restrained", "editorial", "monumental"]).optional(),
        notes: z.array(z.string()).optional(),
      })
      .optional(),
    materialDirection: z.array(z.string()).optional(),
    compositionDensity: z.number().min(0).max(1),
    entropyLevel: z.number().min(0).max(1).optional(),
    intensity: z.enum(["low", "medium", "high"]).optional(),
    approved: z.boolean(),
    revision: z.number().int().positive().optional(),
  }),
  issueStructure: z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        type: zineSectionTypeSchema,
        title: z.string().optional(),
        pageIds: z.array(z.string()),
        required: z.boolean(),
      }),
    ),
    navigationStyle: z.enum(["continuous", "sectioned"]),
    totalPages: z.number().int().nonnegative(),
  }),
  issuePlan: z
    .object({
      schemaVersion: z.literal(1),
      artifactId: z.string(),
      revision: z.number().int().positive(),
      editorialThesis: z.string(),
      unresolvedQuestion: z.string().optional(),
      pages: z.array(z.any()),
      rhythm: z.any(),
      evaluation: z.object({
        result: z.enum(["pass", "warning", "blocked"]),
        findings: z.array(
          z.object({
            id: z.string(),
            severity: z.enum(["blocking", "warning"]),
            message: z.string(),
            pageId: z.string().optional(),
            correction: z.string().optional(),
          }),
        ),
      }),
      createdAt: z.number(),
      compression: z
        .object({
          decisions: z.array(
            z.object({
              action: z.enum(["removed", "merged", "converted", "kept"]),
              pageId: z.string(),
              rationale: z.string(),
              mergedIntoPageId: z.string().optional(),
            }),
          ),
          removedPageIds: z.array(z.string()),
          mergedPageIds: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
  pages: z.array(zinePageSpecSchema),
  cover: z.object({
    imageUrl: z.string().optional(),
    originalImageUrl: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    issueNumber: z.string().optional(),
    overlays: z.array(editorElementSchema),
    treatment: z.enum([
      "specimen",
      "editorial",
      "dark-plate",
      "dossier",
      "minimal",
    ]),
    bakedImageUrl: z.string().optional(),
    overlayBaked: z.boolean(),
    covers: z
      .array(
        z.object({
          url: z.string(),
          seed: z.string(),
          prompt: z.string(),
          selected: z.boolean(),
        }),
      )
      .optional(),
  }),
  colophon: z.object({
    creatorHandle: z.string(),
    generatedBy: z.literal("mimi"),
    generatedAt: z.number(),
    publicSourceIds: z.array(z.string()),
    sourceCount: z.number().int().nonnegative(),
    notes: z.array(z.string()).optional(),
    fontSubstitutions: z.array(z.string()).optional(),
  }),
  publication: z.object({
    visibility: z.enum(["private", "unlisted", "public"]),
    publishedAt: z.number().optional(),
    canonicalUrl: z.string().optional(),
    revision: z.number().int().positive().optional(),
  }),
  exportState: z.object({
    lastValidatedAt: z.number().optional(),
    lastExportedAt: z.number().optional(),
    formats: z.array(z.enum(["pdf", "png", "zip", "mimizine"])).optional(),
    blockingDiagnosticIds: z.array(z.string()).optional(),
  }),
  revisions: z.array(
    z.object({
      revision: z.number().int().positive(),
      parentRevision: z.number().int().positive().optional(),
      createdAt: z.number(),
      reason: z.string().optional(),
      changedPageIds: z.array(z.string()),
    }),
  ),
  revision: z.number().int().positive(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export function parseMimiZineArtifact(value: unknown): MimiZineArtifact {
  return mimiZineArtifactSchema.parse(value) as MimiZineArtifact;
}

export function safeParseMimiZineArtifact(value: unknown) {
  return mimiZineArtifactSchema.safeParse(value);
}
