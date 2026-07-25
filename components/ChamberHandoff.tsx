import React from "react";
import { ArrowRight, Info, Link2 } from "lucide-react";

export type HandoffModuleId =
  | "scribe"
  | "pocket"
  | "the-edit"
  | "studio"
  | "moodboard"
  | "tailor"
  | "the-press";

interface ChamberHandoffProps {
  moduleId: HandoffModuleId | string;
}

const PHASES = [
  { key: "COLLECT", label: "COLLECT", desc: "Scribe" },
  { key: "READ", label: "READ", desc: "Pocket" },
  { key: "SHAPE", label: "SHAPE", desc: "The Edit / Mood Board / Tailor" },
  { key: "MAKE", label: "MAKE", desc: "Studio" },
  { key: "PUBLISH", label: "PUBLISH", desc: "The Press" },
];

const HANDOFF_MAP: Record<
  HandoffModuleId,
  {
    phase: "COLLECT" | "READ" | "SHAPE" | "MAKE" | "PUBLISH";
    arrivedFrom: { text: string; items?: string[] };
    workingOn: string;
    next: { label: string; actionView: string; desc: string };
  }
> = {
  scribe: {
    phase: "COLLECT",
    arrivedFrom: {
      text: "External raw input, pasted dialogues, links, and loose fragments",
    },
    workingOn: "Faithfully capturing and structuring project atoms without formatting or flattening your voice",
    next: {
      label: "Send selected atoms to The Edit",
      actionView: "the-edit",
      desc: "Frame thesis & assemble text chapters",
    },
  },
  pocket: {
    phase: "READ",
    arrivedFrom: {
      text: "Scribe (project atoms, raw links, text fragments, and mirrored specimens)",
    },
    workingOn: "Retrieving, reviewing, and organizing curated source material and evidence",
    next: {
      label: "Use approved compile in Studio",
      actionView: "studio",
      desc: "Apply evidence directly to active issue & cover design",
    },
  },
  "the-edit": {
    phase: "SHAPE",
    arrivedFrom: {
      text: "Scribe & Pocket (curated items, approved evidence, and structured atoms)",
    },
    workingOn: "Structuring chapters, framing editorial thesis, and checking compile diagnostics",
    next: {
      label: "Use approved compile in Studio",
      actionView: "studio",
      desc: "Populate draft outline with the structured read",
    },
  },
  moodboard: {
    phase: "SHAPE",
    arrivedFrom: {
      text: "Pocket (visual specimens, color swatches, images, and brand assets)",
    },
    workingOn: "Defining spatial relationships and tokenizing aesthetic properties on the Axis Canvas",
    next: {
      label: "Apply Mood Board tokens to cover brief",
      actionView: "studio",
      desc: "Inject tokens directly into the Worktable style parameters",
    },
  },
  tailor: {
    phase: "SHAPE",
    arrivedFrom: {
      text: "Pocket & Studio (approved specimens and design principles)",
    },
    workingOn: "Establishing reusable, evidence-based aesthetic laws and editorial voice briefs",
    next: {
      label: "Apply style rules to cover brief",
      actionView: "studio",
      desc: "Inject creative laws as structured prompts",
    },
  },
  studio: {
    phase: "MAKE",
    arrivedFrom: {
      text: "The Edit, Mood Board & Tailor (shaped brief, visual tokens, and voice laws)",
    },
    workingOn: "Synthesizing text, generating covers, and designing final layout",
    next: {
      label: "Send completed issue to The Press",
      actionView: "the-press",
      desc: "Prepare final rendering, package, and distribution metadata",
    },
  },
  "the-press": {
    phase: "PUBLISH",
    arrivedFrom: {
      text: "Studio (completed issue files, designed cover, and editorial metadata)",
    },
    workingOn: "Compiling final PDF distribution packages, printing, and sharing the publication",
    next: {
      label: "Export or Share publication",
      actionView: "profile",
      desc: "Access your dashboard to distribute or view live",
    },
  },
};

export const ChamberHandoff: React.FC<ChamberHandoffProps> = ({ moduleId }) => {
  return null;
};
