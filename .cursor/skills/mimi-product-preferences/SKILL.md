---
name: mimi-product-preferences
description: Durable Mimi product/UX preferences — shared shells, quiet chrome, semantic feedback, honest empty states, consent, brand casing, and shipping loops. Use when changing Studio/chamber UI, motion/haptics, empty/error states, collective/observatory features, brand copy, or when a redesign risks overbuilding.
---

# Mimi product preferences

Mined from recurring product direction. Prefer these over inventing a new visual or feedback system per chamber.

## Trigger

UI/chrome/public-face work, Studio OS / chamber shells, motion or haptics, empty/failure states, consent/collective surfaces, brand strings, or a UI that feels like a SaaS dashboard / design-doc skin.

## Product model

1. **Shared shells, not N redesigns.** Extend `components/studio-os/` family shells and `lib/productCanon.ts` / `lib/design-system.ts`. Do not invent a parallel chamber inventory or per-chamber visual system.
2. **Editorial instrument.** Handled evidence over decorative chrome. Prefer specimen plates, slips, seals, and dossiers over generic cards/stat strips.
3. **Quiet bottom chrome (Studio OS).** Anchors are Map · Mimi seal · Find only (`StudioNavigation`). Do not add a permanent multi-chamber tab bar.
4. **One precise motif.** Do not pile lace/tape/wax/x-ray/decorative marks. Handwriting is never required UI.
5. **Primary promise first on mobile.** Shell-first labs (e.g. Dolls); reduce competing chrome. One primary plate; secondary tools in sheets.
6. **Brand.** User-facing name is **Mimi** (not “Mimi Zine”). Never render readable `MIMI` via CSS `uppercase` on brand strings — wireframe all-caps is mock noise.
7. **Overbuild correction.** If a change lands too clean / dashboard-like, pull back to a middle ground with physical/editorial evidence — do not full-reverse product intent.

## Feedback and honesty

When adding motion, haptics, empty states, or provider-backed results:

1. Route feedback through the semantic orchestrator (`useFeedback()` → `feedback.trigger("proposal.approved")` etc. in `hooks/useFeedback.ts` / `lib/feedback/`). Never call `navigator.vibrate` or invent local spring/haptic constants in components.
2. Haptics are sparse punctuation: thresholds only; never on hover; never before a confirmed mutation (`confirmed: false` blocks optimistic presses). Honor `haptics: "off"` and reduced motion.
3. Empty/failure must be honest: empty memory ≠ partial completion; storage/IDB failure ≠ intentional delete; show coverage/provenance when relevant.
4. Collective / Observatory features need explicit contribution consent. Public visibility ≠ consented contribution. Keep Observatory distinct from Residue namespaces.
5. Migrate incrementally. Do not rename chambers or change unrelated behavior in the same pass.

New semantic events belong in `lib/feedback/feedback.types.ts` + recipes — do not bypass the matrix.

## Shipping loops

1. **Merge conflicts:** fetch `origin/main`; fix simple conflicts; stop and report when product intents conflict — do not silently blend opposing UX directions.
2. **CI / Bugbot / bot review:** verify the finding exists, fix root cause, recheck. Use `.cursor/skills/fix-bot-pr-comments/SKILL.md` when sweeping bot comments.
3. **After architectural handoffs:** “pursue goal” / “your call” means own sequencing within stated constraints; ask only on intent conflicts or missing credentials.
4. **Do not merge** to `main` / production branches or change Vercel env/domains unless explicitly asked.
5. After UI/chrome changes, run the mobile UX checklist in `AGENTS.md` (`npm run review:mobile`).

## Stop conditions

- Conflicting product intents in a merge or redesign → report, don’t guess.
- Fix needs secrets/credentials not in the environment → note the blocker.
- Request would invent a second design system or permanent chamber bottom bar → push back to shared shells + Map/seal/Find.
