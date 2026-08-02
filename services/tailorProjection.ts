import type { ArtworkMatch, CreativeDossier, Doll, TailorProject, TasteGraphDocument } from '../types';

export class ProjectProjectionMismatchError extends Error {
  readonly code = 'project_graph_mismatch' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ProjectProjectionMismatchError';
  }
}

/** Fail closed when project and taste graph identifiers do not agree. */
export function assertProjectGraphBinding(
  project: Pick<TailorProject, 'id' | 'tasteGraphId'>,
  tasteGraphId: string,
): void {
  if (!project.tasteGraphId) {
    throw new ProjectProjectionMismatchError(
      `Tailor project ${project.id} has no tasteGraphId; cannot resolve projections.`,
    );
  }
  if (project.tasteGraphId !== tasteGraphId) {
    throw new ProjectProjectionMismatchError(
      `Taste graph ${tasteGraphId} does not belong to project ${project.id} (expected ${project.tasteGraphId}).`,
    );
  }
}

export function assertGraphBelongsToProject(
  graph: Pick<TasteGraphDocument, 'id' | 'projectId'>,
  projectId: string,
): void {
  if (graph.projectId && graph.projectId !== projectId) {
    throw new ProjectProjectionMismatchError(
      `Taste graph ${graph.id} is bound to project ${graph.projectId}, not ${projectId}.`,
    );
  }
}

/** Keep only dolls that belong to the project's taste graph. */
export function filterDollsForGraph(dolls: Doll[], tasteGraphId: string): Doll[] {
  return dolls.filter((d) => d.tasteGraphId === tasteGraphId);
}

export function filterDossiersForProject(
  dossiers: CreativeDossier[],
  projectId: string,
  tasteGraphId: string,
): CreativeDossier[] {
  return dossiers.filter((d) => d.projectId === projectId && d.tasteGraphId === tasteGraphId);
}

export function filterArtworkMatchesForProject(
  matches: ArtworkMatch[],
  projectId: string,
): ArtworkMatch[] {
  return matches.filter((m) => m.projectId === projectId);
}

/**
 * Resolve a single doll by explicit id within a project graph.
 * Never falls back to "first sorted" doll from another graph.
 */
export function resolveDollInGraph(
  dolls: Doll[],
  tasteGraphId: string,
  dollId: string,
): Doll {
  const match = dolls.find((d) => d.id === dollId && d.tasteGraphId === tasteGraphId);
  if (!match) {
    throw new ProjectProjectionMismatchError(
      `Doll ${dollId} is not bound to taste graph ${tasteGraphId}.`,
    );
  }
  return match;
}
