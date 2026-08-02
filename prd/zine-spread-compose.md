# PRD: Zine Spread Compose + Issue Visual Ops

**Status**: Implementation  
**Branch**: `mezine-spread-compose-ba01`  
**Type**: Zine reader / authoring / export readiness  
**Related**: `prd/aesthetic-system-overview.md`, `components/ZineLayoutEditor.tsx`, `components/AnalysisDisplay.tsx`

---

## Problem

Zines are structured AI issues, but Visual Plates render as a fixed L/R template. A freeform layout editor (`ZineLayoutEditor`) and `customLayout` model already exist and are unused. Readers also hit undeveloped plates on hi-fi issues, and Signature Takeaways still sits on a warm-cream field that fights House Style v2.

## Goals

1. **Compose spreads in-issue** — Owners can open the layout editor from Visual Plates, save `customLayout`, and see composed spreads in the reader.
2. **Persist layouts** — `customLayout` is first-class on `ZinePageSpec` and survives `pagesJson` / `updateZineMetadata`.
3. **Mode plate grammars** — Default (non-custom) plates vary by issue mode (`editorial` / `research` / `seasonal` / `oracle`).
4. **Hi-fi auto-develop** — High-fidelity issues develop cover/plates without requiring a manual Develop tap.
5. **House Style inside the issue** — Replace cream Signature Takeaways field with the public white/ink kit.

## Non-goals

- Full print imposition / bind workflow (product is not a print shop).
- Rewriting `ZineLayoutEditor` chrome in this pass (wire + house defaults only).
- Pixel-perfect Cormorant embedding inside PDF (structured PDF uses Times/Helvetica; brand fonts stay in the reader).

## Follow-up (landed in same track)

- **Structured archival PDF** via `lib/structuredZinePdf.ts` — ExportChamber PDF no longer html2canvas-rasters `#export-target`.
- **Edit issue-spreads panel** — The Edit compile surfaces recent issues with Compose entry points.
- Export manifest carries `pages[]` summaries + `pdfMode: "structured"`.
- **Hi-fi plate bake at generate** — `bakeZineVisualPlates` runs before `saveZineToProfile` for hi-fi (non-lite) issues.
- **In-Edit compose** — Issue spreads expands plate list and opens `ZineLayoutEditor` without leaving The Edit.

## Acceptance

- Owner on `/zine/:id` can Compose a plate, save, reload, and see the composed spread.
- Non-owners / public share still render saved `customLayout` read-only.
- `npm run verify:zine-spread-compose`, `npm run verify:structured-zine-pdf`, `npm run verify:bake-zine-plates`, and `npm run verify:zine-visual-policy` pass.
- Hi-fi + non-lite issues pass `autoDevelop` to Visualizer for hero/plates **and** attempt generate-time bake.
- Signature Takeaways plate has no `#F5F2EA` cream fill.
- ExportChamber PDF path calls `downloadStructuredZinePdf` (no html2canvas in that branch).
- The Edit → Compose spreads can save `customLayout` via `updateZineMetadata`.
