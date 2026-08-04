export type ResearchEventName =
  | "task_start"
  | "first_meaningful_click"
  | "dead_click"
  | "time_to_first_action"
  | "abandonment"
  | "note";

export interface ResearchEvent {
  sessionId: string;
  taskName: string;
  event: ResearchEventName;
  elementId: string;
  ts: number;
  /** Observer note text — only for `note` events. */
  note?: string;
  /** Page path at capture time — optional export metadata. */
  path?: string;
}

export interface ResearchSessionExport {
  sessionId: string;
  taskName: string;
  startedAt: number;
  exportedAt: number;
  events: ResearchEvent[];
}
