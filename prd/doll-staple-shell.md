# Doll Staple Shell — Persistent Identity Visualization

## Intent
Give every creator a **recognizably Mimi doll** — same species, same cultish presence — while Taste Graph fields only tint wardrobe, palette, motifs, and soft facial accents.

Dolls are **projections**, not identity SoT. The staple Imagen (or Gateway flash-image) prompt is the house lock.

## Reference aesthetic (house north star)
- High-fashion **ball-jointed art doll** (BJD), polished porcelain / vinyl hybrid skin
- **Elongated slender neck**, refined mannequin torso, visible ball joints
- Large glassy reflective eyes, serene slightly uncanny calm (not horror)
- Soft diffused studio light with gentle dreamy bloom; clean neutral backdrop
- Default house hair: sleek chin-length bob — override only from doll hairstyle cues
- Cultish onboarding mood: composed, editorial, “shell awaiting conditioning”

## Non-goals
- Photoreal human portraiture
- Per-user full face reconstruction from uploads as the default (likeness may accent later)
- Scenario projection UI (GAZE / SPARK WITH) in v1 — prompt module must support scenario slots later

## Acceptance
1. Single versioned module builds all doll image prompts (`shell-v1`).
2. Portrait regenerate calls image API with `allowFaces: true`.
3. Studio doll companion context names the shell so zine plates preserve species lock.
4. Offline verify script asserts staple invariants (neck, porcelain/BJD, serene, face allowed).
5. First open of a doll without `generatedImageUrl` auto-runs shell projection (cultish onboarding beat).

## Implementation map
- `services/dollEngine/staplePrompt.ts` — staple + builders
- `components/tailor/DollProfileScreen.tsx` — regenerate uses staple
- `hooks/useStudioDollSelection.ts` — companion context cites shell
- `scripts/verifyDollStaplePrompt.ts` — `npm run verify:doll-staple`
