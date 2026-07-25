# Shopify Integration Architecture

Status: server-owned draft publishing and read-only discovery contracts implemented

## Product position

Mimi is an editorial intelligence system that can speak Shopify. Shopify is one publishing and discovery adapter, not Mimi's canonical data model.

`Tailor → Catalog → Artifact Compiler → Press → Publisher`

| Layer | Responsibility |
| --- | --- |
| Tailor | Compile evidence into reviewable creative rules |
| Catalog | Find external possibilities without changing state |
| Artifact Compiler | Express one approved artifact as target-specific files |
| The Press | Inspect the release and require creator approval |
| Publisher | Create a draft in the selected destination |

## Creator user story

As a creator, I can compile a Shopify product pack without credentials, inspect its price, images, fulfillment, provenance, and search schema, then explicitly create a Shopify draft through a server-owned connection.

### User-flow benefit

1. The Artifact Compiler produces the portable five-file Shopify pack.
2. The Press inspects the pack without contacting Shopify.
3. I decide whether to download it or use Direct Publish.
4. Direct Publish sends my approved product draft and Mimi session to the server.
5. The server obtains a short-lived Shopify token and forces the product to `DRAFT`.
6. Shopify returns the draft ID and Mimi opens the Admin review page.

The browser never receives the Shopify client secret or Admin access token.

## Server configuration

For a store and app owned by the same Shopify organization:

```text
SHOPIFY_SHOP=mimi-editions-2
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
SHOPIFY_API_VERSION=2026-07
```

An existing Admin API access token can be used as a server-only compatibility path:

```text
SHOPIFY_SHOP=mimi-editions-2
SHOPIFY_ADMIN_ACCESS_TOKEN=...
```

Do not use a `VITE_` prefix for any Shopify credential.

The app requires `write_products`. `read_products` is useful for later reconciliation but is not required by the current draft-creation mutation.

## Publishing contract

- `GET /api/shopify/connection` returns non-secret connection status.
- `POST /api/shopify/publish-product` requires a valid Mimi session and `confirmed: true`.
- The handler ignores any client-supplied publication status.
- `lib/shopifyAdmin.ts` validates the draft, exchanges client credentials when configured, and uses GraphQL `productSet`.
- The GraphQL input always uses `status: DRAFT`.
- Mimi provenance is stored in the `mimi.provenance` JSON metafield.

## Catalog discovery

`lib/shopifyCatalog.ts` is a separate read-only adapter for Shopify Global Catalog MCP.

The ChatGPT app exposes `search_shopify_catalog` only when:

```text
SHOPIFY_UCP_AGENT_PROFILE=https://your-public-domain.example/ucp-profile.json
```

The result is a candidate set. Tailor can explain alignment, but discovery does not import, save, buy, publish, or endorse a product.

### Discovery user story

As a creator, I can ask for a product through my approved direction, receive candidates, and understand why each candidate may fit before I choose whether to save anything.

## ChatGPT Tailor review

The existing mini app remains an `interactive-decoupled` MCP app:

1. `compile_tailor_review` accepts canonical or legacy Tailor JSON and returns a compact projection without UI.
2. `render_tailor_review` displays the reviewed projection.
3. The widget shows the thesis, confidence, strong signals, preserve rules, avoid rules, and highest-value next question.
4. Confirm, correct, and import actions return to the conversation; they do not silently mutate a profile.

## Verification

```sh
npm run verify:tailor-contract
npm run verify:shopify-pack
npm run verify:shopify-integration
npm run validate:canon
npm run build
```

