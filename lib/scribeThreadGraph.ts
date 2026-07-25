import type { MemoryAtom } from "../types";

export interface ScribeThreadNode {
  id: string;
  atom: MemoryAtom;
  position: [number, number, number];
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
}

export interface ScribeThreadEdge {
  id: string;
  from: string;
  to: string;
}

const SIGNAL_COLORS: Record<string, string> = {
  dialogue_paste: "#a8b79f",
  conversation_log: "#8b5cf6",
  link_drop: "#06b6d4",
  highlight_selection: "#f59e0b",
  ask_answer: "#ec4899",
  selection_capture: "#10b981",
  manual: "#78716c",
};

export const colorForAtom = (atom: MemoryAtom): string => {
  if (atom.signalType && SIGNAL_COLORS[atom.signalType]) {
    return SIGNAL_COLORS[atom.signalType];
  }
  return "#a8b79f";
};

const hashUnit = (value: string, seed: number): number => {
  let h = seed;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 1000;
};

export const positionForAtom = (
  atom: MemoryAtom,
  index: number,
  total: number,
): [number, number, number] => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radial = 2.2 + hashUnit(atom.id, 7) * 3.5;
  const y = (hashUnit(atom.projectId + atom.id, 3) - 0.5) * 2.4;
  return [Math.cos(angle) * radial, y, Math.sin(angle) * radial];
};

export const buildScribeThreadGraph = (
  atoms: MemoryAtom[],
): { nodes: ScribeThreadNode[]; edges: ScribeThreadEdge[] } => {
  const slice = atoms.slice(0, 48);
  const nodes: ScribeThreadNode[] = slice.map((atom, index) => ({
    id: atom.id,
    atom,
    position: positionForAtom(atom, index, slice.length),
    color: colorForAtom(atom),
    orbitRadius: 0.4 + hashUnit(atom.id, 11) * 0.8,
    orbitSpeed: 0.08 + hashUnit(atom.id, 13) * 0.12,
  }));

  const byProject = new Map<string, string[]>();
  const byTag = new Map<string, string[]>();

  slice.forEach((atom) => {
    const projectKey = atom.projectId || "Default Project";
    byProject.set(projectKey, [...(byProject.get(projectKey) || []), atom.id]);
    (atom.tags || []).forEach((tag) => {
      byTag.set(tag, [...(byTag.get(tag) || []), atom.id]);
    });
  });

  const edgeKeys = new Set<string>();
  const edges: ScribeThreadEdge[] = [];

  const linkCluster = (ids: string[], prefix: string) => {
    if (ids.length < 2) return;
    const hub = ids[0];
    ids.slice(1, 4).forEach((id) => {
      const key = [hub, id].sort().join("--");
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ id: `${prefix}-${key}`, from: hub, to: id });
    });
  };

  byProject.forEach((ids, project) => linkCluster(ids, `proj-${project}`));
  byTag.forEach((ids, tag) => {
    if (ids.length >= 2 && ids.length <= 6) linkCluster(ids, `tag-${tag}`);
  });

  return { nodes, edges };
};
