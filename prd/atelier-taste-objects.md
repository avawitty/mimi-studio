# Atelier — Taste-Signal Objects

## Goal

Let creators pin semiotic/commerce objects from zines as **taste evidence** (desires and buyer orientation), then revisit them in a dedicated Atelier chamber. Saves are not a wishlist or cart. Desire pins feed Studio/Tailor generation; reference pins stay light cultural context.

## Requirements

1. In-zine commerce touchpoints support whole-card flip (object ↔ why it belongs) with product thumbnail when Shopify-verified data exists.
2. Pinning offers **Desire** vs **Reference** so research pins do not look like buyer intent.
3. Pinning stores a durable taste signal: motif, image, vendor, price, link, rationale, trigger, zine provenance, intent.
4. Copy frames the action as keeping a signal — never “add to cart” / “save for later.”
5. Atelier chamber lists saved objects across issues with open-source, intent switch, and unpin; no checkout actions.
6. Studio zine generation injects Atelier desire/reference context (desire weighted higher).
7. Tailor evidence dossier prior-context includes Atelier desire/reference summaries.
8. Soft cap of 40 pins; oldest **reference** pins prune first when full.
9. Pins without resonance confirm for ~21 days surface “Still resonant?” with confirm/release.
10. Intel Hub / Press may approve up to **3** Shopify catalog candidates; zine generation hydrates them as acquisition signals.
11. Positioning: Thimble = sourcing, Pocket = media archive, Atelier = commerce-as-taste.
12. Optional: log a `ProductTasteEvent` (`interactionType: 'save'`) for desire pins when authenticated.

## Acceptance

- Pin / unpin from a zine commerce signal updates Atelier immediately (same browser profile).
- Desire vs Reference can be switched in-zine and in Atelier.
- Generating a zine with pinned desire objects includes an `ATELIER TASTE OBJECTS` block in the prompt path.
- Tailor Scry prior context includes atelier desire/reference arrays when pins exist.
- Multi-select commerce objects (≤3) hydrate multiple acquisition signals in the zine.
- Soft-cap enforcement prefers dropping reference pins; capacity shown in Atelier.
- Atelier appears on Chamber Map at `/atelier`.
- `npm run validate:canon`, `npm run verify:atelier`, and `npm run verify:intel-hub` pass.
