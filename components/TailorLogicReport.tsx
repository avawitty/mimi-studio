import React, { useState } from 'react';
import { X, Copy, Check, Zap, Eye, Type } from 'lucide-react';
import { TailorLogicDraft } from '../types';

interface TailorLogicReportProps {
  draft: TailorLogicDraft;
  personaName?: string;
  onClose: () => void;
}

export const TailorLogicReport: React.FC<TailorLogicReportProps> = ({ draft, personaName, onClose }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'voice'>('visual');
  const [copied, setCopied] = useState(false);

  // Derive Image Generation Prompt / Directives
  const silhouettes = draft?.positioningCore?.aestheticCore?.silhouettes || [];
  const materiality = draft?.positioningCore?.aestheticCore?.materiality || [];
  const mediaStyle = draft?.positioningCore?.aestheticCore?.mediaStyle || [];
  const eraBias = draft?.positioningCore?.aestheticCore?.eraBias || 'Undefined Era';
  const density = draft?.positioningCore?.aestheticCore?.density ?? 5;
  const entropy = draft?.positioningCore?.aestheticCore?.entropy ?? 5;
  const baseNeutral = draft?.expressionEngine?.chromaticRegistry?.baseNeutral || '#000000';
  const accentSignal = draft?.expressionEngine?.chromaticRegistry?.accentSignal || '#ffffff';

  const imageDirectives = [
    `CRITICAL VISUAL COMPOSITIONS: Incorporate visual silhouettes referencing: ${silhouettes.length > 0 ? silhouettes.join(', ') : 'minimal structure'}.`,
    `MATERIALITY & SURFACE: Emphasis on structural finishes such as ${materiality.length > 0 ? materiality.join(', ') : 'matte, premium stock'}.`,
    `MEDIA & CHRONOLOGY: Establish a ${eraBias} aesthetic context using ${mediaStyle.length > 0 ? mediaStyle.join(', ') : 'archival photography'}.`,
    `ENGINE DYNAMICS: Set layout semantic complexity (Density: ${density}/10) and physical randomness/organic drift (Entropy: ${entropy}/10).`,
    `COLOR SCIENCE BINDING: Anchor background and structural tones in Base Neutral (${baseNeutral}) and active highlights in Accent Signal (${accentSignal}).`
  ].join('\n\n');

  // Derive Text / Editorial Directives
  const emotionalTemp = draft?.expressionEngine?.narrativeVoice?.emotionalTemperature || 'restrained';
  const structureBias = draft?.expressionEngine?.narrativeVoice?.structureBias || 'concise';
  const lexicalDensity = draft?.expressionEngine?.narrativeVoice?.lexicalDensity ?? 5;
  const restraintLevel = draft?.expressionEngine?.narrativeVoice?.restraintLevel ?? 5;
  const voiceNotes = draft?.expressionEngine?.narrativeVoice?.voiceNotes || '';
  const culturalReferences = draft?.positioningCore?.anchors?.culturalReferences || [];

  const textDirectives = [
    `VOICE PROTOCOL & REGISTER: Set tone to ${emotionalTemp} with a ${structureBias} syntactic rhythm.`,
    `LEXICAL SPECTRUM: Lexical density is locked at ${lexicalDensity}/10 (vocabulary complexity) with restraint calibrated at ${restraintLevel}/10 (information withholding/poetic pauses).`,
    `CULTURAL PATHWAY ANCHORS: Filter concepts and narrative threads through: ${culturalReferences.length > 0 ? culturalReferences.join(', ') : 'avant-garde systems'}.`,
    voiceNotes ? `TACTICAL VOICE NOTES: ${voiceNotes}` : '',
  ].filter(Boolean).join('\n\n');

  const currentTextToCopy = activeTab === 'visual' ? imageDirectives : textDirectives;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTextToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        id="tailor-logic-report-panel"
        className="w-full max-w-4xl bg-[#1c1c1c] border border-stone-800 text-stone-100 flex flex-col h-[85vh] md:h-[80vh] shadow-2xl rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap size={15} className="text-stone-100" />
            <div>
              <h2 className="font-sans text-[11px] uppercase tracking-widest font-black text-stone-100">
                Mimi Logic Report
              </h2>
              {personaName && (
                <p className="font-mono text-[8px] text-stone-400 mt-0.5 uppercase tracking-wider">
                  Active Persona: {personaName}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-800 bg-[#161616] shrink-0">
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-2 px-6 py-3 font-sans text-[9px] uppercase tracking-widest font-black transition-all border-r border-stone-800 ${
              activeTab === 'visual' 
                ? 'bg-[#1c1c1c] text-stone-100 border-b-2 border-stone-300' 
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Eye size={12} />
            Visual Logic
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 px-6 py-3 font-sans text-[9px] uppercase tracking-widest font-black transition-all border-r border-stone-800 ${
              activeTab === 'voice' 
                ? 'bg-[#1c1c1c] text-[#eaeaea] border-b-2 border-stone-300' 
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Type size={12} />
            Voice Logic
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#121212] border border-stone-800 p-6 min-h-[250px] font-mono whitespace-pre-wrap select-text text-stone-300 text-[11px] leading-relaxed">
            {activeTab === 'visual' ? (
              <div className="space-y-4">
                <div className="text-[10px] text-stone-400 border-b border-stone-800/80 pb-2 mb-3 uppercase tracking-widest font-black">
                  Image Directives Schema
                </div>
                {imageDirectives}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] text-stone-400 border-b border-stone-800/80 pb-2 mb-3 uppercase tracking-widest font-black">
                  Core Scribe Text Directives
                </div>
                {textDirectives}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#161616] border-t border-stone-800 shrink-0 flex items-center justify-between">
          <span className="font-sans text-[8px] text-stone-400 uppercase tracking-widest">
            Statically Derived Schema • No AI Latency
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 font-sans text-[8px] uppercase tracking-widest font-black transition-all"
          >
            {copied ? (
              <>
                <Check size={12} />
                Copied Directive
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy Directives
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
