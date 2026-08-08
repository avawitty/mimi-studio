import type {
  StudioFamily,
  VisualPacketId,
} from "../../../lib/productCanon";

export interface VisualPacket {
  id: VisualPacketId;
  family: StudioFamily;
  physicalMetaphor: string;
  anomalousDetail: string;
  dominantArtifact: string;
  redMark: string;
  motion: "settle" | "misregister" | "clip" | "stamp" | "reveal";
}

const packet = (
  id: VisualPacketId,
  family: StudioFamily,
  physicalMetaphor: string,
  anomalousDetail: string,
  dominantArtifact: string,
  redMark: string,
  motion: VisualPacket["motion"],
): VisualPacket => ({
  id,
  family,
  physicalMetaphor,
  anomalousDetail,
  dominantArtifact,
  redMark,
  motion,
});

export const VISUAL_PACKETS: Record<VisualPacketId, VisualPacket> = {
  "desk-index": packet("desk-index", "orientation", "desk index", "one tab exceeds the sheet", "active dossier", "registrar tick", "settle"),
  "codex-index": packet("codex-index", "orientation", "reference folio", "one pencilled cross-reference", "system diagram", "folio mark", "reveal"),
  "worktable-layers": packet("worktable-layers", "production", "worktable", "layers overlap instead of tile", "working proof", "approval line", "settle"),
  "loose-note": packet("loose-note", "capture", "loose note", "typed words briefly misregister", "open field", "intake tick", "misregister"),
  "evidence-lanes": packet("evidence-lanes", "capture", "evidence sleeve", "one lane remains visibly empty", "source ledger", "query mark", "reveal"),
  "darkroom-proof": packet("darkroom-proof", "capture", "contact sheet", "one frame carries a grease-pencil crop", "developed asset", "crop mark", "reveal"),
  "filing-surface": packet("filing-surface", "library", "filing cabinet", "one item is paper-clipped", "provenance sleeve", "custody tick", "clip"),
  "wardrobe-sleeves": packet("wardrobe-sleeves", "library", "garment sleeves", "one fabric note crosses the rule", "garment specimen", "inventory tick", "clip"),
  "object-ledger": packet("object-ledger", "library", "object ledger", "one receipt edge remains visible", "taste object", "desire mark", "clip"),
  "private-envelope": packet("private-envelope", "library", "sealed envelope", "a blush annotation stays partly hidden", "protected material", "privacy line", "reveal"),
  "custody-ledger": packet("custody-ledger", "library", "registrar ledger", "one chain-of-custody correction", "specimen record", "custody stamp", "stamp"),
  "profile-dossier": packet("profile-dossier", "identity", "personal dossier", "handwritten correction over a machine label", "profile specimen", "revision mark", "settle"),
  "signature-specimen": packet("signature-specimen", "identity", "signature card", "one baseline is manually corrected", "signature plate", "approval line", "stamp"),
  "signal-graph": packet("signal-graph", "identity", "thread map", "one thread escapes the plotting field", "taste graph", "node mark", "settle"),
  "diagnostics-sheet": packet("diagnostics-sheet", "identity", "diagnostic sheet", "one reading is crossed out", "evidence chart", "contradiction mark", "reveal"),
  "style-specimen": packet("style-specimen", "identity", "style specimen", "one clipped handwriting sample", "reference plate", "approval tick", "clip"),
  "celestial-chart": packet("celestial-chart", "identity", "calibration chart", "one coordinate is pencilled in", "timing plate", "calibration mark", "settle"),
  "twilight-mirror": packet("twilight-mirror", "intelligence", "obsidian mirror", "one reflection stays deliberately faint", "twilight reading", "mesopic mark", "reveal"),
  "identity-portrait": packet("identity-portrait", "identity", "portrait folio", "one silhouette extends beyond its mount", "identity portrait", "plate number", "reveal"),
  "mortuary-file": packet("mortuary-file", "identity", "mortuary file", "one discarded label is still legible", "inverse portrait", "refusal line", "reveal"),
  "editorial-signal": packet("editorial-signal", "production", "editorial galley", "one sentence is hand-corrected", "direction statement", "approval tick", "settle"),
  "house-blueprint": packet("house-blueprint", "production", "folded blueprint", "one floor continues off-sheet", "issue structure", "binding mark", "reveal"),
  "composition-board": packet("composition-board", "production", "pin board", "one reference overlaps the margin", "reference composition", "crop line", "settle"),
  "intelligence-ledger": packet("intelligence-ledger", "intelligence", "evidence plate", "one redaction reveals on request", "evidence ledger", "contradiction line", "reveal"),
  "geographic-plate": packet("geographic-plate", "intelligence", "survey plate", "one coordinate is offset", "spatial variation", "location mark", "settle"),
  "residue-trace": packet("residue-trace", "intelligence", "trace paper", "one afterimage remains unlabelled", "residue reading", "uncertainty mark", "reveal"),
  "forecast-plot": packet("forecast-plot", "intelligence", "plotting paper", "one projected line stays dotted", "directional projection", "projection mark", "settle"),
  "observatory-ledger": packet("observatory-ledger", "intelligence", "observation ledger", "one sample remains outside the average", "collective readout", "sample mark", "settle"),
  "distribution-strip": packet("distribution-strip", "intelligence", "measurement strip", "one outlier sits beyond the rule", "distribution", "median mark", "settle"),
  "proofing-table": packet("proofing-table", "publishing", "registrar table", "one proof corner is folded", "final proof", "approval seal", "stamp"),
  "archive-stand": packet("archive-stand", "publishing", "issue rack", "one issue sits slightly proud", "published issue", "archive tick", "settle"),
  "public-stage": packet("public-stage", "publishing", "program sheet", "one audience note enters the margin", "public encounter", "release mark", "reveal"),
  "correspondence-desk": packet("correspondence-desk", "services", "correspondence folder", "an attached dispatch slip", "working packet", "handoff line", "clip"),
  "dispatch-folder": packet("dispatch-folder", "services", "sourcing folder", "one material swatch is stapled in", "scope packet", "dispatch stamp", "clip"),
};

export function getVisualPacket(id?: VisualPacketId): VisualPacket | null {
  return id ? VISUAL_PACKETS[id] : null;
}
