export type MimiAiTaskKind =
  | "copy"
  | "editorial_review"
  | "strategy"
  | "moodboard_report"
  | "task_planning"
  | "vision_analysis"
  | "embedding"
  | "image_generation"
  | "tailor_analysis"
  | "zine_lite"
  | "zine_full"
  | "zine_deep";

export type MimiCreditRoute = "funded_gateway" | "local_or_byok" | "image_route" | "free_internal";

export interface MimiAiCreditPolicy {
  task: MimiAiTaskKind;
  label: string;
  credits: number;
  route: MimiCreditRoute;
  commentary: string;
}

export const MIMI_AI_CREDIT_POLICIES: Record<MimiAiTaskKind, MimiAiCreditPolicy> = {
  copy: {
    task: "copy",
    label: "Light Reading",
    credits: 1,
    route: "funded_gateway",
    commentary: "Short copy, captions, rewrites, tags, and low-cost synthesis.",
  },
  editorial_review: {
    task: "editorial_review",
    label: "Editorial Review",
    credits: 1,
    route: "funded_gateway",
    commentary: "A focused read of existing material before Mimi turns it into direction.",
  },
  strategy: {
    task: "strategy",
    label: "Strategy Pass",
    credits: 3,
    route: "funded_gateway",
    commentary: "Deeper reasoning for positioning, planning, or brand architecture.",
  },
  moodboard_report: {
    task: "moodboard_report",
    label: "Moodboard Report",
    credits: 2,
    route: "funded_gateway",
    commentary: "Reference synthesis that turns saved visuals into pattern language.",
  },
  task_planning: {
    task: "task_planning",
    label: "Task Plan",
    credits: 1,
    route: "funded_gateway",
    commentary: "A small planning pass that keeps the creative loop moving.",
  },
  vision_analysis: {
    task: "vision_analysis",
    label: "Vision Read",
    credits: 2,
    route: "funded_gateway",
    commentary: "Image-aware interpretation for visual references and uploads.",
  },
  embedding: {
    task: "embedding",
    label: "Indexing",
    credits: 0,
    route: "free_internal",
    commentary: "Internal memory/indexing work should not be presented as a paid generation.",
  },
  image_generation: {
    task: "image_generation",
    label: "Image Generation",
    credits: 2,
    route: "image_route",
    commentary: "Image routes use the image ledger because provider costs differ from text.",
  },
  tailor_analysis: {
    task: "tailor_analysis",
    label: "Tailor Analysis",
    credits: 1,
    route: "funded_gateway",
    commentary: "A compact taste/profile read; the first Tailor pass can still be free.",
  },
  zine_lite: {
    task: "zine_lite",
    label: "Lite Zine",
    credits: 1,
    route: "funded_gateway",
    commentary: "A quick issue draft or lower-cost editorial return.",
  },
  zine_full: {
    task: "zine_full",
    label: "Full Zine",
    credits: 2,
    route: "funded_gateway",
    commentary: "The default Mimi generation: structured issue, report, or full creative return.",
  },
  zine_deep: {
    task: "zine_deep",
    label: "Deep Research",
    credits: 3,
    route: "funded_gateway",
    commentary: "High-fidelity or deeper reasoning runs that should cost more by design.",
  },
};

export const creditPolicyForTask = (task: MimiAiTaskKind) => MIMI_AI_CREDIT_POLICIES[task];

export const creditCostForTask = (task: MimiAiTaskKind) => creditPolicyForTask(task).credits;
