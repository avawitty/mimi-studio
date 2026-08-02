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
8. Optional: log a `ProductTasteEvent` (`interactionType: 'save'`) for desire pins when authenticated.

## Acceptance

- Pin / unpin from a zine commerce signal updates Atelier immediately (same browser profile).
- Desire vs Reference can be switched in-zine and in Atelier.
- Generating a zine with pinned desire objects includes an `ATELIER TASTE OBJECTS` block in the prompt path.
- Tailor Scry prior context includes atelier desire/reference arrays when pins exist.
- Atelier appears on Chamber Map at `/atelier`.
- `npm run validate:canon` and `npm run verify:atelier` pass.
