import type { TailoringIntent } from '../types';
import {
  createTailorProject,
  addEvidenceNode,
  createFieldNote,
} from './tailorService';

export async function startTailorFromIntake(
  userId: string,
  intent: TailoringIntent,
  options: {
    title?: string;
    blurb?: string;
    imageDataUrls?: string[];
    noteTitle?: string;
    noteBody?: string;
  },
): Promise<{ projectId: string; tasteGraphId?: string }> {
  const project = await createTailorProject(userId, intent, options.title);

  if (options.blurb) {
    const { updateTailorProject } = await import('./tailorService');
    await updateTailorProject(userId, project.id, { blurb: options.blurb });
  }

  for (const dataUrl of options.imageDataUrls ?? []) {
    await addEvidenceNode(userId, project.id, {
      sourceType: 'image',
      title: 'Intake reference',
      uploadedFileUrl: dataUrl,
      thumbnailUrl: dataUrl,
    });
  }

  if (options.noteBody) {
    await createFieldNote(userId, {
      projectId: project.id,
      title: options.noteTitle ?? 'Intake note',
      body: options.noteBody,
      noteType: 'source',
      linkedEvidenceNodeIds: [],
      linkedPatternClusterIds: [],
      linkedCreativeLawIds: [],
      linkedDollIds: [],
      tags: ['intake-bridge'],
    });
  }

  return { projectId: project.id, tasteGraphId: project.tasteGraphId };
}

export function tailorIntakePath(projectId: string): string {
  return `/tailor?project=${projectId}`;
}
