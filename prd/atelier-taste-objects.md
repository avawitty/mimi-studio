# Atelier — Taste-Signal Objects

## Goal

Let creators pin semiotic/commerce objects from zines as **taste evidence** (desires and buyer orientation), then revisit them in a dedicated Atelier chamber. Saves are not a wishlist or cart.

## Requirements

1. In-zine commerce touchpoints support whole-card flip (object ↔ why it belongs) with product thumbnail when Shopify-verified data exists.
2. Pinning an object stores a durable taste signal: motif, image, vendor, price, link, rationale, trigger, zine provenance.
3. Copy frames the action as keeping a signal (“Keep as signal”), never “add to cart” / “save for later.”
4. Atelier chamber lists saved objects across issues with open-source and unpin; no checkout actions.
5. Optional: log a `ProductTasteEvent` (`interactionType: 'save'`) when authenticated so taste aggregation can learn from pins.

## Acceptance

- Pin / unpin from a zine commerce signal updates Atelier immediately (same browser profile).
- Atelier appears on Chamber Map at `/atelier`.
- `npm run validate:canon` passes with Atelier registered.
