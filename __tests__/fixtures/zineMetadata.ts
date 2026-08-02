import type { ZineMetadata, ZinePageSpec } from "../../types";

export function makeLegacyPages(): ZinePageSpec[] {
  return [
    {
      pageNumber: 1,
      headline: "Custody of the stray thought",
      bodyCopy: "The archive is asking for custody, not additional volume.",
      imagePrompt: "archival specimen on a white field",
      image_url: "https://cdn.example.test/developed-master.jpg",
      originalMediaUrl: "https://cdn.example.test/original-source.jpg",
      altText: "A clipped archival specimen",
      sourceIds: ["source-1"],
      assetVariants: {
        thumbnailUrl: "https://cdn.example.test/thumb.jpg",
        previewUrl: "https://cdn.example.test/preview.jpg",
        masterUrl: "https://cdn.example.test/master.jpg",
        width: 1600,
        height: 2000,
      },
    },
    {
      pageNumber: 2,
      headline: "Evidence remains handled",
      bodyCopy: "A source ledger keeps observation separate from inference.",
      imagePrompt: "evidence ledger",
      sourceIds: ["source-1"],
      customLayout: {
        elements: [
          {
            id: "headline",
            type: "text",
            content: "Evidence remains handled",
            style: {
              top: 12,
              left: 10,
              width: 78,
              fontSize: 2,
              fontFamily: "Cormorant Garamond",
            },
          },
          {
            id: "body",
            type: "text",
            content: "Observed material and inferred pattern keep separate labels.",
            style: {
              top: 54,
              left: 14,
              width: 62,
              fontSize: 0.9,
              fontFamily: "Georgia",
            },
          },
        ],
        readingOrder: ["headline", "body"],
      },
    },
  ];
}

export function makeLegacyZineMetadata(): ZineMetadata {
  const pages = makeLegacyPages();
  return {
    id: "zine_legacy_1",
    fragmentsUsed: ["atom-private", "atom-export"],
    usedContextSnapshots: [
      {
        atomId: "atom-private",
        title: "Private note",
        content: "A private working note that must not travel.",
        source: "Scribe",
        visibility: { working: true, export: false, public: false },
      },
      {
        atomId: "atom-export",
        title: "Exportable source",
        content: "Source body must still be redacted.",
        source: "Pocket",
        visibility: { working: true, export: true, public: false },
      },
    ],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
    theme: "white editorial",
    aestheticVector: {},
    userId: "owner-1",
    userHandle: "ava",
    title: "The Handled Archive",
    tone: "editorial",
    timestamp: 1_700_000_001_000,
    likes: 0,
    originalInput: "I want somewhere to put the stray thought.",
    coverImageUrl: "data:image/jpeg;base64,baked-cover",
    content: {
      meta: {
        mode: "editorial",
        intent: "Return scattered material as an authored issue.",
        timestamp: 1_700_000_000_000,
        originalCoverImageUrl: "https://cdn.example.test/original-cover.jpg",
        studioCoverOverlays: [
          {
            id: "cover-title",
            kind: "text",
            text: "The Handled Archive",
            x: 10,
            y: 78,
            fontSize: 20,
            color: "#ffffff",
          },
        ],
      },
      taste_context: {
        active_archetype: "Archivist",
        active_palette: ["#ffffff", "#111110", "#7d83c5"],
      },
      structure: {
        hero_prompt: "archival cover",
        pages,
      },
      visual_guidance: {
        strict_palette: ["#ffffff", "#111110", "#7d83c5"],
        negative_prompt: "equal cards, decorative nostalgia",
        composition_density: 0.45,
      },
      title: "The Handled Archive",
      the_reading: "The archive is asking for custody rather than more information.",
      strategic_hypothesis: "Visible provenance makes interpretation more trustworthy.",
      semiotic_signals: [
        {
          motif: "Custody",
          context: "Source material remains inspectable.",
          epistemicStatus: "observed",
          sourceIds: ["source-1"],
          sourceCount: 1,
        },
      ],
      pages: [],
      pagesJson: JSON.stringify(pages),
      roadmap: {
        strategicThesis: "Make provenance part of the composition.",
        positioningAxis: "Archive / interface",
        authorityAnchor: {
          coreClaim: "The source remains visible.",
          repetitionVector: "Colophon and evidence slips",
          exclusionPrinciple: "No decorative evidence theater",
        },
        intensity: "medium",
        densityLevel: 0.45,
        entropyLevel: 0.2,
        timelineMode: "standard",
        phases: [],
        driftForecast: {
          predictedClusterShift: "",
          audienceEvolution: "",
          absorptionRisk: "",
          overexposureRisk: "",
          refusalPoint: "",
        },
      },
    },
  };
}
