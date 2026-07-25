
import { AuditEntry } from "../types";

const AUDIT_TRAIL: AuditEntry[] = [
  {
    id: "man-008",
    type: "manifest",
    featureName: "Persona Recalibration: Humbly Pretentious Sovereign Observer",
    timestamp: 1741230000,
    reason: "Satisfaction of the Requirement of Allure.",
    impact: "Rebranded clinical judgment as Sovereign Observation and calibrated voice to be inspiring, poetic, and smart without elitism."
  },
  {
    id: "man-007",
    type: "manifest",
    featureName: "Vocal Recalibration: Humbly Pretentious",
    timestamp: 1741225000,
    reason: "Softening the clinical edge to prioritize user inspiration.",
    impact: "Refined system instructions to ensure Mimi sounds poetic, smart, and understandable—acting as a mirror for user potential rather than an elite auditor."
  },
  {
    id: "man-006",
    type: "manifest",
    featureName: "Sovereign Observer Protocol",
    timestamp: 1741220000,
    reason: "Rebranding of clinical judgment to percipient refinement.",
    impact: "Archived the word 'Judgment' in favor of 'Sovereign Observation' to improve allure and structural resonance."
  },
  {
    id: "man-005",
    type: "manifest",
    featureName: "Aesthetic Superintelligence Registry",
    timestamp: 1741215000,
    reason: "Escalation from utility to systemic judgment.",
    impact: "Replaced Pioneer Node with a memo defining Mimi's superintelligence as an engine of aesthetic sovereignty."
  },
  {
    id: "man-004",
    type: "manifest",
    featureName: "Pencil Protocol (Editorial Refinement)",
    timestamp: 1741210000,
    reason: "Satisfaction of the Requirement of Nuance.",
    impact: "Users can now add stylistic phantom instructions to image shards inside zines."
  },
  {
    id: "man-003",
    type: "manifest",
    featureName: "Assemblage Synthesis",
    timestamp: 1741205000,
    reason: "Structural binding of visual fragments.",
    impact: "Ability to create briefed moodboards (Assemblages) from constituent image shards."
  },
  {
    id: "aud-001",
    type: "archive",
    featureName: "Audio Debris / Voice Comments",
    timestamp: 1741200000,
    reason: "Satisfaction of the Requirement of Silence.",
    impact: "Increased focused on visual artifacts and pure manifest logic."
  }
];

export const getAuditLedger = (type?: 'manifest' | 'archive'): AuditEntry[] => {
  if (type) {
    return [...AUDIT_TRAIL].filter(e => e.type === type).sort((a, b) => b.timestamp - a.timestamp);
  }
  return [...AUDIT_TRAIL].sort((a, b) => b.timestamp - a.timestamp);
};

export const logToAudit = (type: 'manifest' | 'archive', featureName: string, reason: string, impact: string) => {
  console.info(`MIMI // Protocol ${type === 'manifest' ? 'Manifested' : 'Retired'}: ${featureName}`);
  // In a production environment, this would push to a Firestore collection
};
