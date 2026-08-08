import type { EvidenceNode, Observation } from '../../types';
import type { CalibrationCandidate } from './contracts';

function featureIdFromLabel(label: string): string {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, '_');
  return `tag:${normalized}`;
}

export function buildCalibrationCandidates(
  evidence: EvidenceNode[],
  observations: Observation[] = [],
): CalibrationCandidate[] {
  const obsByEvidence = new Map<string, Observation[]>();
  for (const obs of observations) {
    const list = obsByEvidence.get(obs.evidenceNodeId) ?? [];
    list.push(obs);
    obsByEvidence.set(obs.evidenceNodeId, list);
  }

  return evidence
    .filter((node) => node.analysisStatus === 'analyzed' || node.thumbnailUrl || node.uploadedFileUrl)
    .map((node) => {
      const featureLabels: Record<string, string> = {};
      const featureIdSet = new Set<string>();

      for (const tag of node.tags ?? []) {
        const id = featureIdFromLabel(tag);
        featureIdSet.add(id);
        featureLabels[id] = tag;
      }

      const meta = node.extractedMetadata as Record<string, unknown> | undefined;
      const motifs = Array.isArray(meta?.motifs) ? (meta.motifs as string[]) : [];
      const moods = Array.isArray(meta?.moods) ? (meta.moods as string[]) : [];
      for (const label of [...motifs, ...moods]) {
        const id = featureIdFromLabel(label);
        featureIdSet.add(id);
        featureLabels[id] = label;
      }

      for (const obs of obsByEvidence.get(node.id) ?? []) {
        const id = featureIdFromLabel(obs.label);
        featureIdSet.add(id);
        featureLabels[id] = obs.label;
        if (obs.description) {
          const descId = featureIdFromLabel(obs.description);
          featureIdSet.add(descId);
          featureLabels[descId] = obs.description;
        }
      }

      const imageUrl = node.thumbnailUrl ?? node.uploadedFileUrl ?? node.sourceUrl;
      const altText =
        node.userCaption?.trim() ||
        node.description?.trim() ||
        node.title?.trim() ||
        'Reference image';

      return {
        id: node.id,
        label: node.title || altText,
        imageUrl,
        altText,
        featureIds: [...featureIdSet],
        featureLabels,
        tags: node.tags ?? [],
      };
    })
    .filter((candidate) => candidate.featureIds.length > 0 || candidate.imageUrl);
}
