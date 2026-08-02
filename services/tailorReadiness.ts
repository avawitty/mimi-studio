import type { CreativeLaw, MarketingAsset, PatternCluster, TailorProject } from '../types';

export const MARKETING_ASSET_TYPES = [
  'social_post',
  'poster',
  'landing_page_hero',
  'product_card',
  'zine_cover',
  'campaign_caption',
  'brand_statement',
  'press_blurb',
  'visual_prompt',
] as const satisfies readonly MarketingAsset['assetType'][];

export type MarketingAssetType = (typeof MARKETING_ASSET_TYPES)[number];

export type GenerationPrerequisite =
  | 'missing_project'
  | 'missing_taste_graph'
  | 'no_evidence'
  | 'no_accepted_patterns'
  | 'no_accepted_laws'
  | 'invalid_asset_type'
  | 'project_graph_mismatch';

export type GenerationBlocked = {
  ok: false;
  prerequisite: GenerationPrerequisite;
  explanation: string;
  recoveryAction: string;
};

export type GenerationReadiness = { ok: true } | GenerationBlocked;

export function isGenerationBlocked(value: GenerationReadiness): value is GenerationBlocked {
  return value.ok === false;
}

export type TailorGenerationAction =
  | 'analyze'
  | 'dossier'
  | 'doll'
  | 'marketing_asset'
  | 'field_notes'
  | 'art_history'
  | 'brand_export';

export function isMarketingAssetType(value: unknown): value is MarketingAssetType {
  return typeof value === 'string' && (MARKETING_ASSET_TYPES as readonly string[]).includes(value);
}

function blocked(
  prerequisite: GenerationPrerequisite,
  explanation: string,
  recoveryAction: string,
): GenerationReadiness {
  return { ok: false, prerequisite, explanation, recoveryAction };
}

export function evaluateGenerationReadiness(input: {
  action: TailorGenerationAction;
  project: TailorProject | null | undefined;
  evidenceCount: number;
  patterns: PatternCluster[];
  laws: CreativeLaw[];
  assetType?: unknown;
  expectedTasteGraphId?: string;
}): GenerationReadiness {
  const { action, project, evidenceCount, patterns, laws, assetType, expectedTasteGraphId } = input;

  if (!project) {
    return blocked(
      'missing_project',
      'No Tailor project is loaded for this generation.',
      'Start or resume a Tailor project from Evidence Intake.',
    );
  }

  if (!project.tasteGraphId) {
    return blocked(
      'missing_taste_graph',
      'This project has no linked Taste Graph, so projections cannot be grounded.',
      'Recreate the project or re-run intake so a Taste Graph is attached.',
    );
  }

  if (expectedTasteGraphId && expectedTasteGraphId !== project.tasteGraphId) {
    return blocked(
      'project_graph_mismatch',
      'The requested Taste Graph does not belong to this Tailor project.',
      'Pass the project’s tasteGraphId explicitly — never join independently sorted first records.',
    );
  }

  if (action === 'marketing_asset') {
    if (!isMarketingAssetType(assetType)) {
      return blocked(
        'invalid_asset_type',
        'Marketing asset type is missing or not in the allowed set.',
        `Choose one of: ${MARKETING_ASSET_TYPES.join(', ')}.`,
      );
    }
  }

  if (evidenceCount < 1 && action !== 'brand_export') {
    return blocked(
      'no_evidence',
      'Generation needs at least one evidence node in the project.',
      'Add references in Let Mimi Read You, then continue.',
    );
  }

  const groundedPatterns = patterns.filter(
    (p) => p.userStatus === 'accepted' || p.userStatus === 'suggested',
  );
  const acceptedPatterns = patterns.filter((p) => p.userStatus === 'accepted');
  const groundedLaws = laws.filter(
    (l) => l.userStatus === 'accepted' || l.userStatus === 'suggested',
  );
  const acceptedLaws = laws.filter((l) => l.userStatus === 'accepted');

  if (
    (action === 'dossier' || action === 'doll' || action === 'art_history') &&
    groundedPatterns.length < 1 &&
    groundedLaws.length < 1
  ) {
    return blocked(
      'no_accepted_patterns',
      'No patterns or creative laws are available to ground this output.',
      'Run analysis and keep at least one pattern or law before generating.',
    );
  }

  if (action === 'marketing_asset' && acceptedLaws.length < 1) {
    return blocked(
      'no_accepted_laws',
      'Marketing assets require at least one accepted Creative Law.',
      'Open Creative Laws, accept the principles that should drive the asset, then retry.',
    );
  }

  if (action === 'field_notes' && evidenceCount < 1 && acceptedPatterns.length < 1) {
    return blocked(
      'no_evidence',
      'Field Notes need evidence or an accepted pattern to attach.',
      'Keep at least one observation or accept a pattern, then save a note.',
    );
  }

  return { ok: true };
}
