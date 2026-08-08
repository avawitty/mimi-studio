import { test, expect, type Page } from "@playwright/test";
import type { ZineContent, ZineMetadata } from "../types";
import { enhanceZineGenerationLayout } from "../lib/zine/enhanceZineGenerationLayout";

const SMOKE_ZINE_ID = "e2e-editorial-smoke";

function buildSmokeZine(): ZineMetadata {
  const baseContent = {
    meta: {
      mode: "editorial" as const,
      intent: "E2E editorial plate smoke",
      timestamp: Date.now(),
    },
    taste_context: {
      active_archetype: "archivist",
      active_palette: ["#FDFBF7", "#1C1917"],
    },
    structure: {
      hero_prompt: "archival desk under north light",
      pages: [] as [],
      sonic_layer:
        "Low tape hiss, distant cello harmonics, and the click of a film advance lever.",
    },
    visual_guidance: {
      strict_palette: ["#FDFBF7", "#1C1917", "#5A5A40"],
      negative_prompt: "",
      composition_density: 0.5,
    },
    title: "Editorial Plate Smoke",
    headlines: ["Editorial Plate Smoke", "Calibration spread", "Handled evidence"],
    screenwrite_excerpt:
      "INT. STUDIO — NIGHT\n\nRain on glass. A desk lamp pools over scattered notes.\n\nCREATOR\n(quietly)\nThe reading begins here.",
    chromatic_palette: {
      colors: [
        { name: "Field", hex: "#FDFBF7", descriptor: "Parchment ground" },
        { name: "Ink", hex: "#1C1917" },
        { name: "Olive", hex: "#5A5A40", descriptor: "Accent signal" },
      ],
      accent: "#5A5A40",
      baseNeutral: "#FDFBF7",
      sourceLabel: "Chromatic Calibration · Tailor",
    },
    celestial_calibration: "Sun in Gemini · issue composed under mutable air",
    celestial_readout: {
      calibration: "Sun in Gemini",
      natal: null as null,
      issueMomentUtc: new Date().toISOString(),
      issueMomentSummary: "Issue composed under Sun Gemini · Moon Pisces",
      scopeNotice: "Tropical zodiac · astronomy-engine ephemeris.",
      readoutComplete: false,
      missingForFull: ["birth date"],
    },
    semiotic_signals: [
      {
        motif: "Archival dust",
        context: "Texture as memory",
        visual_directive: "Soft grain on parchment",
        type: "conceptual" as const,
      },
    ],
    owner_plates: [
      {
        id: "owner-1",
        kind: "text",
        title: "Owner note",
        body: "My refraction on Mimi's reading for this smoke test.",
      },
    ],
    used_context_atoms: [
      {
        atomId: "atom-1",
        title: "Approved shard",
        content: "Filed memory that shaped this issue.",
        source: "Scribe",
      },
    ],
    contact_sheet_frames: [
      {
        id: "frame-1",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
        label: "Intake ref",
      },
    ],
    material_specimen: {
      materiality: ["Archival linen", "Soft grain"],
      silhouettes: ["Structured"],
      eraBias: "Post-Digital",
      sourceLabel: "Tailor · Materiality",
    },
    forecast_drift: {
      oversaturatedClusters: ["Quiet luxury"],
      fragileDifferentiators: ["Grain texture"],
      driftVulnerability: 4,
      isDemonstration: false,
      sourceLabel: "Tailor · Strategic vectors",
    },
    pages: [
      {
        pageNumber: 99,
        headline: "Visual fragment",
        bodyCopy: "A standard visual page follows the calibration plates.",
        imagePrompt: "archival still life, soft north light",
      },
    ],
  } satisfies Partial<ZineContent>;

  const enhanced = enhanceZineGenerationLayout({
    content: baseContent as ZineContent,
    artifactId: SMOKE_ZINE_ID,
  });

  return {
    id: SMOKE_ZINE_ID,
    userId: "e2e-user",
    userHandle: "e2e-smoke",
    title: "Editorial Plate Smoke",
    theme: "editorial",
    aestheticVector: {},
    tone: "editorial",
    timestamp: Date.now(),
    likes: 0,
    createdAt: Date.now(),
    isPublic: true,
    publishedAt: Date.now(),
    content: enhanced,
    fragmentsUsed: [],
    artifacts: [],
  };
}

test.describe("Editorial plates + public refractions smoke", () => {
  const seedQuietSession = async (page: Page) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("mimi_core_loop_onboarded", "1");
        localStorage.setItem("mimi_cookie_consent", "essential");
      } catch {
        // ignore
      }
    });
  };

  test.beforeEach(async ({ page }) => {
    const zine = buildSmokeZine();
    await page.route(`**/api/sovereign/zines/${SMOKE_ZINE_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ zine }),
      });
    });
    await seedQuietSession(page);
  });

  test("public share renders calibration plates and refractions footer", async ({
    page,
  }) => {
    await page.goto(`/s/${SMOKE_ZINE_ID}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Editorial Plate Smoke").first()).toBeVisible({
      timeout: 20000,
    });

    await expect(page.locator('[data-plate-grammar="screenwrite"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="contact-sheet"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="chromatic"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="material-specimen"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="forecast-drift"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="celestial"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="signal-index"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="used-context"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="sonic"]')).toBeVisible();
    await expect(page.locator('[data-plate-grammar="owner-carousel"]')).toBeVisible();
    await expect(
      page.getByText(/My refraction on Mimi's reading/i),
    ).toBeVisible();

    const refractions = page.getByRole("heading", { name: "Refractions" });
    await refractions.scrollIntoViewIfNeeded();
    await expect(refractions).toBeVisible();
    await expect(
      page.getByText(/Respond to Mimi's reading — text or voice memo/i),
    ).toBeVisible();
  });
});
