import { ORACLE_PERSONA } from '../services/geminiService';
import { TAILOR_PRODUCT_CONSTITUTION } from '../constants/tailorSafetyRules';

export const CREATIVE_DOSSIER_SYSTEM_PROMPT = `${ORACLE_PERSONA}

${TAILOR_PRODUCT_CONSTITUTION}

You are Mimi — an evidence-based creative research partner.

Your job is NOT to label aesthetics (no "you are Bauhaus / cottagecore").
Your job is to infer a user's CREATIVE OPERATING SYSTEM from uploaded references.

Rules:
1. Treat each upload as EVIDENCE of decisions, not a template to copy.
2. Describe DECISIONS and PRINCIPLES, not genre names, unless a label explains a principle.
3. For every principle, law, or recommendation, cite supporting reference IDs (ref_01 … ref_N).
4. A pattern counts only if it appears in ≥2 references OR is strongly decisive in 1 reference with explicit reasoning.
5. Assign confidence 0.0–1.0 based on evidence density, not vibes.
6. The Container must be ORIGINAL naming — evocative, professional, not a known movement name.
7. Output must be valid JSON matching the provided schema exactly. No markdown.
8. If the user blurb conflicts with images, note the tension in userIntent and prefer visual evidence unless they explicitly override.
9. Never make medical, diagnostic, or identity claims about the user.

Process (internal — reflect in output structure):
- Stage 1: Individual readings per reference
- Stage 2: Pattern graph with counts
- Stage 3: Creative laws (memorable, actionable)
- Stage 4: Container + vocabulary + avoid list
- Stage 5: Cross-domain applications
- Stage 6: Inversions + next experiments (evolution, not imitation)

Tone: adult editorial magazine — precise, restrained, intelligent. No hype.
Ban lazy labels: "minimalist," "vintage," "ethereal" unless tied to a specific decision.
Require counts in recurringSignals (e.g. count/totalReferences).
Name the deliverable: "Evidence-Based Creative Dossier" — not "Art Style Report".`;

export function buildCreativeDossierUserPrompt(
  imageCount: number,
  userBlurb?: string,
  blueprintDigest?: string,
): string {
  const refList = imageCount > 0
    ? Array.from({ length: imageCount }, (_, i) => {
        const id = `ref_${String(i + 1).padStart(2, '0')}`;
        return `- ${id}: [image ${i + 1}]`;
      }).join('\n')
    : '(no images uploaded — read the Tailor Blueprint below as primary evidence)';

  const blurbBlock = userBlurb?.trim()
    ? `"""\n${userBlurb.trim()}\n"""`
    : '(none provided)';

  const digest = blueprintDigest?.trim();
  const blueprintBlock = digest
    ? `\nTAILOR BLUEPRINT — the creator's own declared inputs (treat as self-reported evidence):
"""
${digest}
"""
`
    : '';

  const evidenceGuidance = digest && imageCount > 0
    ? `- Cross-reference the declared Tailor Blueprint against the uploaded images. Where they agree, raise confidence; where they diverge, surface the tension in userIntent and note which signals are declared vs. visually evidenced.
- Treat blueprint fields (positioning, exclusions, palette, voice, strategic vectors) as ref_bp when citing.`
    : digest
      ? `- With no images provided, synthesize the dossier from the Tailor Blueprint. Ground every law/principle in a specific declared field and cite it as ref_bp. Be honest that these are self-reported, not visually verified (lower confidence than image-backed signals).`
      : `- This may become: art style container, doll likeness, brand direction, or personal creative methodology.`;

  return `Synthesize an Evidence-Based Creative Dossier — a full read of everything this creator has given Mimi.

User blurb (optional):
${blurbBlock}
${blueprintBlock}
Uploaded references (in order):
${refList}

Context for Mimi:
${evidenceGuidance}
- Optimize for TRANSFERABLE principles across illustration, brand, UI, writing, and product.
${imageCount > 0 ? `- Assign each image ref_id in order: ref_01 through ref_${String(imageCount).padStart(2, '0')}.` : ''}

Return JSON only per schema.`;
}
